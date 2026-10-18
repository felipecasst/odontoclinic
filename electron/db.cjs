// Acesso ao banco SQLite local. Cada função é uma operação usada pela interface.
// Usa node-sqlite3-wasm: o SQLite roda em WebAssembly, sem precisar compilar nada,
// e funciona igual em Windows e Linux. Grava direto no arquivo .db no computador.
const { Database } = require("node-sqlite3-wasm");
const fs = require("node:fs");
const path = require("node:path");

let db = null;
let dbPath = "";

function open(file) {
  dbPath = file;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.exec("PRAGMA foreign_keys = ON");
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  seedIfEmpty();
  return db;
}

/** Executa uma função dentro de uma transação (tudo ou nada). */
function tx(fn) {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Procedimentos e um profissional de exemplo, só na primeira vez. */
function seedIfEmpty() {
  const n = get("SELECT COUNT(*) c FROM procedimentos").c;
  if (n > 0) return;
  const padrao = [
    ["", "Consulta / Avaliação", "Clínica geral", 100, 30],
    ["", "Limpeza (profilaxia)", "Prevenção", 150, 40],
    ["", "Restauração em resina", "Dentística", 180, 50],
    ["", "Extração simples", "Cirurgia", 200, 40],
    ["", "Tratamento de canal", "Endodontia", 700, 90],
    ["", "Clareamento dental", "Estética", 600, 60],
    ["", "Coroa de porcelana", "Prótese", 1200, 60],
    ["", "Implante unitário", "Implantodontia", 2500, 90],
    ["", "Aparelho ortodôntico (instalação)", "Ortodontia", 1500, 60],
    ["", "Manutenção de aparelho", "Ortodontia", 150, 30],
    ["", "Raspagem (periodontia)", "Periodontia", 250, 50],
    ["", "Radiografia periapical", "Exames", 40, 15],
  ];
  tx(() => padrao.forEach((p) => run("INSERT INTO procedimentos (codigo, nome, categoria, preco, duracao) VALUES (?,?,?,?,?)", ...p)));
}

// Os parâmetros vão sempre como um array (API do node-sqlite3-wasm).
const all = (sql, ...p) => db.all(sql, p);
const get = (sql, ...p) => db.get(sql, p) ?? undefined;
const run = (sql, ...p) => db.run(sql, p);

/** INSERT a partir de um objeto -> id criado. */
function insert(table, obj) {
  const keys = Object.keys(obj);
  const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  return Number(run(sql, ...keys.map((k) => obj[k])).lastInsertRowid);
}
/** UPDATE por id a partir de um objeto. */
function update(table, id, obj) {
  const keys = Object.keys(obj);
  if (!keys.length) return;
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(",")} WHERE id=?`;
  run(sql, ...keys.map((k) => obj[k]), id);
}

// --- Configuração / profissionais / procedimentos ---
const api = {
  getConfig: () => get("SELECT * FROM clinica WHERE id=1"),
  saveConfig: (c) => update("clinica", 1, c),

  listProfissionais: (todos) =>
    all(`SELECT * FROM profissionais ${todos ? "" : "WHERE ativo=1"} ORDER BY nome`),
  saveProfissional: (p) => (p.id ? (update("profissionais", p.id, strip(p)), p.id) : insert("profissionais", strip(p))),

  listProcedimentos: (todos) =>
    all(`SELECT * FROM procedimentos ${todos ? "" : "WHERE ativo=1"} ORDER BY nome`),
  saveProcedimento: (p) => (p.id ? (update("procedimentos", p.id, strip(p)), p.id) : insert("procedimentos", strip(p))),

  // --- Pacientes ---
  listPacientes: (termo) => {
    if (termo && termo.trim()) {
      const t = `%${termo.trim()}%`;
      const d = `%${termo.replace(/\D/g, "")}%`;
      return all(
        "SELECT * FROM pacientes WHERE ativo=1 AND (nome LIKE ? OR cpf LIKE ? OR telefone LIKE ?) ORDER BY nome LIMIT 500",
        t, d, d,
      );
    }
    return all("SELECT * FROM pacientes WHERE ativo=1 ORDER BY nome LIMIT 500");
  },
  getPaciente: (id) => get("SELECT * FROM pacientes WHERE id=?", id),
  savePaciente: (p) => (p.id ? (update("pacientes", p.id, strip(p)), p.id) : insert("pacientes", strip(p))),
  inativarPaciente: (id) => update("pacientes", id, { ativo: 0 }),

  // --- Agenda ---
  listAgendamentos: (de, ate) =>
    all(
      `SELECT a.*, p.nome AS paciente_nome, pr.nome AS profissional_nome, pr.cor AS profissional_cor
       FROM agendamentos a
       LEFT JOIN pacientes p ON p.id=a.paciente_id
       LEFT JOIN profissionais pr ON pr.id=a.profissional_id
       WHERE a.inicio < ? AND a.fim > ? ORDER BY a.inicio`,
      ate, de,
    ),
  saveAgendamento: (a) => (a.id ? (update("agendamentos", a.id, strip(a)), a.id) : insert("agendamentos", strip(a))),
  setStatusAgendamento: (id, status) => update("agendamentos", id, { status }),
  deleteAgendamento: (id) => run("DELETE FROM agendamentos WHERE id=?", id),
  proximosAgendamentos: (paciente_id) =>
    all(
      `SELECT a.*, pr.nome AS profissional_nome FROM agendamentos a LEFT JOIN profissionais pr ON pr.id=a.profissional_id
       WHERE a.paciente_id=? ORDER BY a.inicio DESC LIMIT 50`,
      paciente_id,
    ),

  // --- Odontograma ---
  listOdontograma: (paciente_id) => all("SELECT * FROM odontograma WHERE paciente_id=? ORDER BY dente", paciente_id),
  addOdontograma: (o) => insert("odontograma", strip(o)),
  updateOdontograma: (id, patch) => update("odontograma", id, patch),
  deleteOdontograma: (id) => run("DELETE FROM odontograma WHERE id=?", id),

  // --- Evolução clínica ---
  listEvolucoes: (paciente_id) =>
    all(
      `SELECT e.*, pr.nome AS profissional_nome FROM evolucoes e LEFT JOIN profissionais pr ON pr.id=e.profissional_id
       WHERE e.paciente_id=? ORDER BY e.data DESC`,
      paciente_id,
    ),
  addEvolucao: (e) => insert("evolucoes", strip(e)),
  deleteEvolucao: (id) => run("DELETE FROM evolucoes WHERE id=?", id),

  // --- Planos de tratamento ---
  listPlanos: (paciente_id) => all("SELECT * FROM planos WHERE paciente_id=? ORDER BY criado_em DESC", paciente_id),
  getPlano: (id) => {
    const plano = get("SELECT * FROM planos WHERE id=?", id);
    if (!plano) return null;
    plano.itens = all("SELECT * FROM plano_itens WHERE plano_id=? ORDER BY id", id);
    return plano;
  },
  savePlano: (p) => (p.id ? (update("planos", p.id, strip(p, ["itens"])), p.id) : insert("planos", strip(p, ["itens"]))),
  deletePlano: (id) => run("DELETE FROM planos WHERE id=?", id),
  addItem: (i) => insert("plano_itens", strip(i)),
  updateItem: (id, patch) => update("plano_itens", id, patch),
  deleteItem: (id) => run("DELETE FROM plano_itens WHERE id=?", id),

  // --- Financeiro ---
  addLancamentos: (lista) => tx(() => lista.map((r) => insert("financeiro", strip(r)))),
  saveLancamento: (l) => (l.id ? (update("financeiro", l.id, strip(l)), l.id) : insert("financeiro", strip(l))),
  deleteLancamento: (id) => run("DELETE FROM financeiro WHERE id=?", id),
  listFinanceiro: (filtro) => {
    const { tipo, de, ate, pagos, paciente_id } = filtro || {};
    const where = [];
    const args = [];
    if (tipo) (where.push("tipo=?"), args.push(tipo));
    if (de) (where.push("vencimento>=?"), args.push(de));
    if (ate) (where.push("vencimento<=?"), args.push(ate));
    if (paciente_id) (where.push("paciente_id=?"), args.push(paciente_id));
    if (pagos === "pendentes") where.push("pago_em=''");
    if (pagos === "pagos") where.push("pago_em<>''");
    const sql = `SELECT f.*, p.nome AS paciente_nome FROM financeiro f LEFT JOIN pacientes p ON p.id=f.paciente_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY vencimento, f.id`;
    return all(sql, ...args);
  },
  quitarLancamento: (id, pago_em, forma) => update("financeiro", id, { pago_em, forma: forma || "" }),

  // --- Indicadores (dashboard) ---
  dashboard: (hoje, inicioMes, fimMes) => ({
    pacientes: get("SELECT COUNT(*) c FROM pacientes WHERE ativo=1").c,
    agendaHoje: all(
      `SELECT a.*, p.nome AS paciente_nome, pr.nome AS profissional_nome, pr.cor AS profissional_cor
       FROM agendamentos a LEFT JOIN pacientes p ON p.id=a.paciente_id LEFT JOIN profissionais pr ON pr.id=a.profissional_id
       WHERE substr(a.inicio,1,10)=? ORDER BY a.inicio`,
      hoje,
    ),
    aReceberMes: get(
      "SELECT COALESCE(SUM(valor),0) v FROM financeiro WHERE tipo='receita' AND pago_em='' AND vencimento BETWEEN ? AND ?",
      inicioMes, fimMes,
    ).v,
    recebidoMes: get(
      "SELECT COALESCE(SUM(valor),0) v FROM financeiro WHERE tipo='receita' AND pago_em<>'' AND substr(pago_em,1,7)=substr(?,1,7)",
      inicioMes,
    ).v,
    despesasMes: get(
      "SELECT COALESCE(SUM(valor),0) v FROM financeiro WHERE tipo='despesa' AND vencimento BETWEEN ? AND ?",
      inicioMes, fimMes,
    ).v,
    vencidos: get(
      "SELECT COUNT(*) c, COALESCE(SUM(valor),0) v FROM financeiro WHERE tipo='receita' AND pago_em='' AND vencimento < ?",
      hoje,
    ),
    aniversariantes: all(
      "SELECT id, nome, nascimento, telefone FROM pacientes WHERE ativo=1 AND substr(nascimento,6,5)=substr(?,6,5) ORDER BY nome",
      hoje,
    ),
  }),

  // --- Backup: cópia direta do arquivo (o banco fica sempre completo em disco) ---
  backup: (dest) => {
    fs.copyFileSync(dbPath, dest);
    return true;
  },
  dbPath: () => dbPath,
  close: () => db && db.close(),
};

/** Remove campos calculados antes de gravar (ex.: nomes vindos de JOIN). */
function strip(obj, extra = []) {
  const skip = new Set([
    "id", "itens", "paciente_nome", "profissional_nome", "profissional_cor", "criado_em", ...extra,
  ]);
  const out = {};
  for (const k of Object.keys(obj)) if (!skip.has(k) && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

module.exports = { open, api, get db() { return db; } };
