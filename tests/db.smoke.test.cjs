const { test } = require("node:test");
const assert = require("node:assert");
const os = require("node:os"), path = require("node:path"), fs = require("node:fs");
const { open, api } = require("../electron/db.cjs");

test("banco: fluxo completo persistindo em arquivo", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "odo-"));
  open(path.join(dir, "test.db"));
  assert.ok(api.listProcedimentos().length >= 10, "procedimentos criados automaticamente");

  const prof = api.saveProfissional({ nome: "Dra. Ana", cro: "SP-1", cor: "#2a7de1", comissao: 40, ativo: 1 });
  const pac = api.savePaciente({ nome: "João Silva", cpf: "52998224725", telefone: "11987654321", nascimento: "1990-05-10", ativo: 1 });
  assert.equal(api.listPacientes("joão").length, 1);
  assert.equal(api.listPacientes("529").length, 1);

  const ag = api.saveAgendamento({ paciente_id: pac, profissional_id: prof, inicio: "2026-03-10 09:00", fim: "2026-03-10 09:30", procedimento: "Avaliação", status: "agendado", observacoes: "" });
  const lista = api.listAgendamentos("2026-03-10 00:00", "2026-03-11 00:00");
  assert.equal(lista.length, 1);
  assert.equal(lista[0].paciente_nome, "João Silva");
  api.setStatusAgendamento(ag, "atendido");
  assert.equal(api.listAgendamentos("2026-03-10 00:00", "2026-03-11 00:00")[0].status, "atendido");

  const od = api.addOdontograma({ paciente_id: pac, dente: "16", face: "O", tipo: "carie", estado: "existente", cor: "", observacao: "" });
  assert.equal(api.listOdontograma(pac).length, 1);
  api.deleteOdontograma(od);
  assert.equal(api.listOdontograma(pac).length, 0);

  const plano = api.savePlano({ paciente_id: pac, profissional_id: prof, titulo: "Plano 1", status: "orcamento", desconto: 50 });
  api.addItem({ plano_id: plano, procedimento_id: null, descricao: "Restauração", dente: "16", face: "", quantidade: 2, valor: 180, status: "pendente", concluido_em: "", profissional_id: null });
  api.addItem({ plano_id: plano, procedimento_id: null, descricao: "Canal", dente: "26", face: "", quantidade: 1, valor: 700, status: "pendente", concluido_em: "", profissional_id: null });
  const full = api.getPlano(plano);
  assert.equal(full.itens.length, 2);

  const ids = api.addLancamentos([1, 2, 3].map((p) => ({ tipo: "receita", paciente_id: pac, plano_id: plano, descricao: `Parcela ${p}/3`, categoria: "Tratamento", valor: 320, vencimento: `2026-0${2 + p}-10`, pago_em: "", forma: "", parcela: p, parcelas: 3 })));
  assert.equal(ids.length, 3);
  let fin = api.listFinanceiro({ tipo: "receita", paciente_id: pac });
  assert.equal(fin.length, 3);
  api.quitarLancamento(fin[0].id, "2026-03-10", "pix");
  assert.equal(api.listFinanceiro({ tipo: "receita", pagos: "pendentes" }).length, 2);

  api.deletePlano(plano); // CASCADE apaga itens
  assert.equal(api.getPlano(plano), null);

  const dash = api.dashboard("2026-03-10", "2026-03-01", "2026-03-31");
  assert.ok(dash.pacientes >= 1);

  const bkp = path.join(dir, "backup.db");
  api.backup(bkp);
  assert.ok(fs.existsSync(bkp) && fs.statSync(bkp).size > 0);
  api.close();

  // reabrir o backup confirma persistência
  open(bkp);
  assert.equal(api.listPacientes("").length, 1);
  api.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
