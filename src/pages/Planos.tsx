import { useEffect, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { Field, Modal, confirmar } from "../components/ui.tsx";
import { STATUS_PLANO, gerarParcelas, money, somaItens, totalPlano, ymd } from "../domain.ts";
import { acao, db, useApp } from "../store.ts";
import type { Plano, PlanoItem } from "../types.ts";

export function Planos({ pacienteId }: { pacienteId: number }) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [abertoId, setAbertoId] = useState<number | null>(null);

  const carregar = () => db<Plano[]>("listPlanos", pacienteId).then(setPlanos);
  useEffect(() => void carregar(), [pacienteId]);

  const novo = async () => {
    const id = await acao(() => db<number>("savePlano", { paciente_id: pacienteId, titulo: "Plano de tratamento", status: "orcamento", desconto: 0 }));
    if (id != null) {
      await carregar();
      setAbertoId(id as number);
    }
  };

  if (abertoId) return <PlanoDetalhe id={abertoId} onVoltar={() => (setAbertoId(null), carregar())} pacienteId={pacienteId} />;

  return (
    <div className="planos">
      <div className="row between">
        <h3>Planos de tratamento e orçamentos</h3>
        <button className="primary" onClick={novo}>+ Novo plano</button>
      </div>
      {planos.length === 0 ? (
        <p className="muted">Nenhum plano ainda. Crie um orçamento com os procedimentos planejados.</p>
      ) : (
        <table className="tabela">
          <thead><tr><th>Título</th><th>Status</th><th>Criado</th><th></th></tr></thead>
          <tbody>
            {planos.map((p) => (
              <tr key={p.id} onClick={() => setAbertoId(p.id)} className="click">
                <td>{p.titulo}</td>
                <td><span className={"status s-" + p.status}>{STATUS_PLANO[p.status]}</span></td>
                <td>{(p.criado_em || "").slice(0, 10).split("-").reverse().join("/")}</td>
                <td>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PlanoDetalhe({ id, pacienteId, onVoltar }: { id: number; pacienteId: number; onVoltar(): void }) {
  const procedimentos = useApp((s) => s.procedimentos);
  const profissionais = useApp((s) => s.profissionais);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [cobrar, setCobrar] = useState(false);

  const carregar = () => db<Plano>("getPlano", id).then(setPlano);
  useEffect(() => void carregar(), [id]);
  if (!plano) return null;
  const itens = plano.itens ?? [];
  const total = totalPlano(itens, plano.desconto);

  const salvarPlano = (patch: Partial<Plano>) => {
    setPlano({ ...plano, ...patch });
    db("savePlano", { id, ...patch });
  };

  const addProcedimento = async (procId: number) => {
    const proc = procedimentos.find((p) => p.id === procId);
    if (!proc) return;
    await db("addItem", { plano_id: id, procedimento_id: proc.id, descricao: proc.nome, dente: "", face: "", quantidade: 1, valor: proc.preco, status: "pendente" });
    carregar();
  };
  const addLivre = async () => {
    await db("addItem", { plano_id: id, procedimento_id: null, descricao: "Novo item", dente: "", face: "", quantidade: 1, valor: 0, status: "pendente" });
    carregar();
  };
  const mudarItem = (item: PlanoItem, patch: Partial<PlanoItem>) => {
    setPlano({ ...plano, itens: itens.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) });
  };
  const gravarItem = (item: PlanoItem, patch: Partial<PlanoItem>) => db("updateItem", item.id, patch);
  const removerItem = async (item: PlanoItem) => {
    await db("deleteItem", item.id);
    carregar();
  };
  const concluir = async (item: PlanoItem) => {
    const novo = item.status === "concluido" ? { status: "pendente", concluido_em: "" } : { status: "concluido", concluido_em: ymd(new Date()) };
    await db("updateItem", item.id, novo);
    carregar();
  };

  return (
    <div className="plano-detalhe">
      <div className="row between">
        <button className="link" onClick={onVoltar}>‹ Voltar aos planos</button>
        <select value={plano.status} onChange={(e) => salvarPlano({ status: e.target.value })} className={"status-sel s-" + plano.status}>
          {Object.entries(STATUS_PLANO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="plano-head">
        <input className="plano-titulo" value={plano.titulo} onChange={(e) => setPlano({ ...plano, titulo: e.target.value })}
          onBlur={(e) => db("savePlano", { id, titulo: e.target.value })} />
        <select value={plano.profissional_id ?? ""} onChange={(e) => salvarPlano({ profissional_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Profissional responsável…</option>
          {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      <table className="tabela itens">
        <thead><tr><th>Procedimento</th><th>Dente</th><th>Qtd</th><th>Valor</th><th>Subtotal</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id} className={i.status === "concluido" ? "feito" : ""}>
              <td><input value={i.descricao} onChange={(e) => mudarItem(i, { descricao: e.target.value })} onBlur={(e) => gravarItem(i, { descricao: e.target.value })} /></td>
              <td><input className="mini" value={i.dente} onChange={(e) => mudarItem(i, { dente: e.target.value })} onBlur={(e) => gravarItem(i, { dente: e.target.value })} /></td>
              <td><input className="mini" type="number" min={1} value={i.quantidade} onChange={(e) => mudarItem(i, { quantidade: Number(e.target.value) })} onBlur={(e) => gravarItem(i, { quantidade: Number(e.target.value) })} /></td>
              <td><input className="valor" type="number" step="0.01" value={i.valor} onChange={(e) => mudarItem(i, { valor: Number(e.target.value) })} onBlur={(e) => gravarItem(i, { valor: Number(e.target.value) })} /></td>
              <td>{money(i.quantidade * i.valor)}</td>
              <td><button className={"check" + (i.status === "concluido" ? " on" : "")} onClick={() => concluir(i)} title="Marcar como concluído">{i.status === "concluido" ? "✓ Concluído" : "Pendente"}</button></td>
              <td><button className="icon-btn" onClick={() => removerItem(i)}><Icon name="trash" size={15} /></button></td>
            </tr>
          ))}
          {itens.length === 0 && <tr><td colSpan={7} className="muted center">Adicione procedimentos abaixo.</td></tr>}
        </tbody>
      </table>

      <div className="add-itens">
        <select defaultValue="" onChange={(e) => { if (e.target.value) addProcedimento(Number(e.target.value)); e.target.value = ""; }}>
          <option value="">+ Adicionar procedimento da tabela…</option>
          {procedimentos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {money(p.preco)}</option>)}
        </select>
        <button onClick={addLivre}>+ Item livre</button>
      </div>

      <div className="plano-total">
        <div className="total-linha"><span>Subtotal</span><b>{money(somaItens(itens))}</b></div>
        <div className="total-linha">
          <span>Desconto (R$)</span>
          <input className="valor" type="number" step="0.01" value={plano.desconto} onChange={(e) => setPlano({ ...plano, desconto: Number(e.target.value) })} onBlur={(e) => db("savePlano", { id, desconto: Number(e.target.value) })} />
        </div>
        <div className="total-linha grande"><span>Total</span><b>{money(total)}</b></div>
        <button className="primary" disabled={total <= 0} onClick={() => setCobrar(true)}>Gerar cobrança / parcelar</button>
      </div>

      {cobrar && <Cobranca plano={plano} total={total} pacienteId={pacienteId} onClose={() => setCobrar(false)} />}
    </div>
  );
}

function Cobranca({ plano, total, pacienteId, onClose }: { plano: Plano; total: number; pacienteId: number; onClose(): void }) {
  const [n, setN] = useState(1);
  const [primeira, setPrimeira] = useState(ymd(new Date()));
  const parcelas = gerarParcelas(total, n, primeira);

  const confirmar2 = async () => {
    const lanc = parcelas.map((p) => ({
      tipo: "receita", paciente_id: pacienteId, plano_id: plano.id,
      descricao: `${plano.titulo} (${p.parcela}/${p.parcelas})`, categoria: "Tratamento",
      valor: p.valor, vencimento: p.vencimento, parcela: p.parcela, parcelas: p.parcelas, forma: "", pago_em: "",
    }));
    await acao(() => db("addLancamentos", lanc), `${n} ${n > 1 ? "parcelas lançadas" : "cobrança lançada"} no financeiro.`);
    if (plano.status === "orcamento") await db("savePlano", { id: plano.id, status: "aprovado" });
    onClose();
  };

  return (
    <Modal title="Gerar cobrança" onClose={onClose}>
      <p>Total do plano: <b>{money(total)}</b></p>
      <div className="row">
        <Field label="Parcelas"><input type="number" min={1} max={60} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value)))} /></Field>
        <Field label="1º vencimento"><input type="date" value={primeira} onChange={(e) => setPrimeira(e.target.value)} /></Field>
      </div>
      <div className="parcelas-preview">
        {parcelas.map((p) => (
          <div key={p.parcela}><span>{p.parcela}/{p.parcelas}</span><span>{p.vencimento.split("-").reverse().join("/")}</span><b>{money(p.valor)}</b></div>
        ))}
      </div>
      <div className="row end">
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={confirmar2}>Lançar no financeiro</button>
      </div>
    </Modal>
  );
}
