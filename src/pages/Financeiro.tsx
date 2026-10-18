import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { Field, Modal, confirmar } from "../components/ui.tsx";
import { formatDateBR, money, ymd } from "../domain.ts";
import { acao, db } from "../store.ts";
import type { Lancamento } from "../types.ts";

const FORMAS = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito", "Boleto", "Transferência"];
const hojeStr = () => ymd(new Date());
const inicioMes = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)); };
const fimMes = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

export function Financeiro() {
  const [tipo, setTipo] = useState<"receita" | "despesa">("receita");
  const [de, setDe] = useState(inicioMes());
  const [ate, setAte] = useState(fimMes());
  const [pagos, setPagos] = useState<"todos" | "pendentes" | "pagos">("todos");
  const [lista, setLista] = useState<Lancamento[]>([]);
  const [editar, setEditar] = useState<Partial<Lancamento> | null>(null);
  const [quitar, setQuitar] = useState<Lancamento | null>(null);

  const carregar = () => db<Lancamento[]>("listFinanceiro", { tipo, de, ate, pagos: pagos === "todos" ? undefined : pagos }).then(setLista);
  useEffect(() => void carregar(), [tipo, de, ate, pagos]);

  const totais = useMemo(() => {
    const pago = lista.filter((l) => l.pago_em).reduce((s, l) => s + l.valor, 0);
    const pend = lista.filter((l) => !l.pago_em).reduce((s, l) => s + l.valor, 0);
    return { pago, pend, total: pago + pend };
  }, [lista]);

  return (
    <div className="financeiro">
      <div className="page-head">
        <h1>Financeiro</h1>
        <button className="primary" onClick={() => setEditar({ tipo, vencimento: hojeStr(), parcela: 1, parcelas: 1, valor: 0 })}>+ Novo lançamento</button>
      </div>

      <div className="fin-filtros">
        <div className="seg">
          <button className={tipo === "receita" ? "on" : ""} onClick={() => setTipo("receita")}>A receber</button>
          <button className={tipo === "despesa" ? "on" : ""} onClick={() => setTipo("despesa")}>A pagar</button>
        </div>
        <Field label="De"><input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></Field>
        <Field label="Até"><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></Field>
        <div className="seg">
          <button className={pagos === "todos" ? "on" : ""} onClick={() => setPagos("todos")}>Todos</button>
          <button className={pagos === "pendentes" ? "on" : ""} onClick={() => setPagos("pendentes")}>Em aberto</button>
          <button className={pagos === "pagos" ? "on" : ""} onClick={() => setPagos("pagos")}>Quitados</button>
        </div>
      </div>

      <div className="fin-totais">
        <div className="ft"><span>{tipo === "receita" ? "Recebido" : "Pago"}</span><b className="verde">{money(totais.pago)}</b></div>
        <div className="ft"><span>Em aberto</span><b className="alerta">{money(totais.pend)}</b></div>
        <div className="ft"><span>Total</span><b>{money(totais.total)}</b></div>
      </div>

      {lista.length === 0 ? (
        <p className="muted center">Nenhum lançamento no período.</p>
      ) : (
        <table className="tabela fin-tabela">
          <thead><tr><th>Vencimento</th><th>Descrição</th>{tipo === "receita" && <th>Paciente</th>}<th>Valor</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {lista.map((l) => {
              const vencido = !l.pago_em && l.vencimento < hojeStr();
              return (
                <tr key={l.id} className={l.pago_em ? "quitado" : vencido ? "vencido" : ""}>
                  <td>{formatDateBR(l.vencimento)}</td>
                  <td>{l.descricao}{l.parcelas > 1 ? ` (${l.parcela}/${l.parcelas})` : ""}</td>
                  {tipo === "receita" && <td>{l.paciente_nome || "—"}</td>}
                  <td className="valor-cel">{money(l.valor)}</td>
                  <td>{l.pago_em ? <span className="status verde">Quitado {formatDateBR(l.pago_em)}</span> : vencido ? <span className="status vermelho">Vencido</span> : <span className="status">Em aberto</span>}</td>
                  <td className="acoes">
                    {!l.pago_em && <button className="mini-btn verde" onClick={() => setQuitar(l)}>Quitar</button>}
                    <button className="icon-btn" onClick={() => setEditar(l)}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn" onClick={async () => { if (await confirmar("Excluir lançamento?")) db("deleteLancamento", l.id).then(carregar); }}><Icon name="trash" size={15} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editar && <LancamentoModal inicial={editar} onClose={() => setEditar(null)} onSalvo={() => (setEditar(null), carregar())} />}
      {quitar && <QuitarModal lanc={quitar} onClose={() => setQuitar(null)} onSalvo={() => (setQuitar(null), carregar())} />}
    </div>
  );
}

function LancamentoModal({ inicial, onClose, onSalvo }: { inicial: Partial<Lancamento>; onClose(): void; onSalvo(): void }) {
  const [l, setL] = useState<Partial<Lancamento>>(inicial);
  const set = (k: keyof Lancamento, v: unknown) => setL((o) => ({ ...o, [k]: v }));
  const [erro, setErro] = useState("");
  const salvar = async () => {
    if (!l.descricao?.trim()) return setErro("Informe a descrição.");
    if (!l.valor || l.valor <= 0) return setErro("Informe um valor maior que zero.");
    const dados = { ...l };
    delete (dados as { paciente_nome?: string }).paciente_nome;
    await acao(() => db("saveLancamento", dados), "Lançamento salvo.");
    onSalvo();
  };
  return (
    <Modal title={l.id ? "Editar lançamento" : l.tipo === "despesa" ? "Nova despesa" : "Nova conta a receber"} onClose={onClose}>
      <Field label="Descrição *"><input value={l.descricao || ""} autoFocus onChange={(e) => set("descricao", e.target.value)} /></Field>
      <div className="row">
        <Field label="Valor (R$)"><input type="number" step="0.01" value={l.valor || 0} onChange={(e) => set("valor", Number(e.target.value))} /></Field>
        <Field label="Vencimento"><input type="date" value={l.vencimento || ""} onChange={(e) => set("vencimento", e.target.value)} /></Field>
      </div>
      <Field label="Categoria"><input value={l.categoria || ""} onChange={(e) => set("categoria", e.target.value)} placeholder={l.tipo === "despesa" ? "Aluguel, material…" : "Tratamento, consulta…"} /></Field>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="row end">
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={salvar}>Salvar</button>
      </div>
    </Modal>
  );
}

function QuitarModal({ lanc, onClose, onSalvo }: { lanc: Lancamento; onClose(): void; onSalvo(): void }) {
  const [pago, setPago] = useState(hojeStr());
  const [forma, setForma] = useState("Dinheiro");
  const confirmar2 = async () => {
    await acao(() => db("quitarLancamento", lanc.id, pago, forma), "Pagamento registrado.");
    onSalvo();
  };
  return (
    <Modal title="Registrar pagamento" onClose={onClose}>
      <p>{lanc.descricao} — <b>{money(lanc.valor)}</b></p>
      <div className="row">
        <Field label="Data do pagamento"><input type="date" value={pago} onChange={(e) => setPago(e.target.value)} /></Field>
        <Field label="Forma"><select value={forma} onChange={(e) => setForma(e.target.value)}>{FORMAS.map((f) => <option key={f}>{f}</option>)}</select></Field>
      </div>
      <div className="row end">
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={confirmar2}>Confirmar pagamento</button>
      </div>
    </Modal>
  );
}
