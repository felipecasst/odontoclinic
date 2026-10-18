import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { Badge, Empty, confirmar } from "../components/ui.tsx";
import { age, formatCPF, formatDateBR, formatPhone, money } from "../domain.ts";
import { STATUS_AGENDA } from "../domain.ts";
import { acao, db, useApp } from "../store.ts";
import type { Agendamento, Lancamento, Paciente } from "../types.ts";
import { EvolucaoClinica } from "./Evolucao.tsx";
import { Odontograma } from "./Odontograma.tsx";
import { PacienteForm } from "./PacienteForm.tsx";
import { Planos } from "./Planos.tsx";

export function Pacientes() {
  const pacienteId = useApp((s) => s.pacienteId);
  const abrirPaciente = useApp((s) => s.abrirPaciente);
  const fecharPaciente = useApp((s) => s.fecharPaciente);
  const [lista, setLista] = useState<Paciente[]>([]);
  const [termo, setTermo] = useState("");
  const [form, setForm] = useState<Paciente | null | "novo">(null);

  const buscar = (t: string) => db<Paciente[]>("listPacientes", t).then(setLista);
  useEffect(() => {
    const id = setTimeout(() => buscar(termo), 200);
    return () => clearTimeout(id);
  }, [termo]);

  if (pacienteId) {
    return <Ficha id={pacienteId} onVoltar={fecharPaciente} onEditar={(p) => setForm(p)}
      formAberto={form !== null}
      form={form === "novo" ? <PacienteForm paciente={null} onClose={() => setForm(null)} onSaved={(id) => (setForm(null), abrirPaciente(id))} /> :
        form ? <PacienteForm paciente={form} onClose={() => setForm(null)} onSaved={() => setForm(null)} /> : null} />;
  }

  return (
    <div className="pacientes">
      <div className="page-head">
        <h1>Pacientes</h1>
        <button className="primary" onClick={() => setForm("novo")}>+ Novo paciente</button>
      </div>
      <input className="busca" placeholder="🔍 Buscar por nome, CPF ou telefone…" value={termo} onChange={(e) => setTermo(e.target.value)} autoFocus />
      {lista.length === 0 ? (
        <Empty icon="users">{termo ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda. Clique em “Novo paciente”."}</Empty>
      ) : (
        <table className="tabela lista-pac">
          <thead><tr><th>Nome</th><th>Idade</th><th>Telefone</th><th>CPF</th><th>Convênio</th></tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="click" onClick={() => abrirPaciente(p.id)}>
                <td><b>{p.nome}</b></td>
                <td>{age(p.nascimento) ?? "—"}{age(p.nascimento) != null ? " anos" : ""}</td>
                <td>{formatPhone(p.telefone) || "—"}</td>
                <td>{formatCPF(p.cpf) || "—"}</td>
                <td>{p.convenio || "Particular"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {form === "novo" && <PacienteForm paciente={null} onClose={() => setForm(null)} onSaved={(id) => (setForm(null), abrirPaciente(id))} />}
    </div>
  );
}

type AbaFicha = "dados" | "odontograma" | "planos" | "evolucao" | "agenda";

function Ficha({ id, onVoltar, onEditar, form, formAberto }: {
  id: number; onVoltar(): void; onEditar(p: Paciente): void; form: React.ReactNode; formAberto: boolean;
}) {
  const [pac, setPac] = useState<Paciente | null>(null);
  const [aba, setAba] = useState<AbaFicha>("dados");

  const carregar = () => db<Paciente>("getPaciente", id).then(setPac);
  useEffect(() => void carregar(), [id, formAberto]);
  if (!pac) return null;

  return (
    <div className="ficha">
      <div className="ficha-topo">
        <button className="link" onClick={onVoltar}>‹ Pacientes</button>
        <div className="ficha-nome">
          <h1>{pac.nome}</h1>
          <div className="ficha-sub">
            {age(pac.nascimento) != null && <span>{age(pac.nascimento)} anos</span>}
            {pac.telefone && <span>📞 {formatPhone(pac.telefone)}</span>}
            {pac.convenio && <Badge cor="#2a7de1">{pac.convenio}</Badge>}
          </div>
        </div>
        <button onClick={() => onEditar(pac)}>Editar dados</button>
      </div>

      <div className="abas">
        {([["dados", "Dados"], ["odontograma", "Odontograma"], ["planos", "Planos / Orçamentos"], ["evolucao", "Evolução clínica"], ["agenda", "Histórico de consultas"]] as [AbaFicha, string][]).map(([k, v]) => (
          <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}>{v}</button>
        ))}
      </div>

      <div className="aba-conteudo">
        {aba === "dados" && <Dados pac={pac} />}
        {aba === "odontograma" && <Odontograma pacienteId={id} />}
        {aba === "planos" && <Planos pacienteId={id} />}
        {aba === "evolucao" && <EvolucaoClinica pacienteId={id} />}
        {aba === "agenda" && <HistoricoConsultas pacienteId={id} />}
      </div>

      {form}
    </div>
  );
}

function Dados({ pac }: { pac: Paciente }) {
  const [fin, setFin] = useState<Lancamento[]>([]);
  useEffect(() => { db<Lancamento[]>("listFinanceiro", { paciente_id: pac.id, tipo: "receita" }).then(setFin); }, [pac.id]);
  const pendente = fin.filter((f) => !f.pago_em).reduce((s, f) => s + f.valor, 0);
  const item = (label: string, valor: string) => valor ? <div className="dado"><span>{label}</span><b>{valor}</b></div> : null;
  return (
    <div className="dados-grid">
      <div className="card">
        <h3>Contato</h3>
        {item("Telefone", formatPhone(pac.telefone))}
        {item("E-mail", pac.email)}
        {item("Nascimento", formatDateBR(pac.nascimento))}
        {item("CPF", formatCPF(pac.cpf))}
        {item("Sexo", { F: "Feminino", M: "Masculino", O: "Outro" }[pac.sexo] || "")}
      </div>
      <div className="card">
        <h3>Endereço</h3>
        {item("Logradouro", [pac.endereco, pac.numero].filter(Boolean).join(", "))}
        {item("Bairro", pac.bairro)}
        {item("Cidade", [pac.cidade, pac.uf].filter(Boolean).join(" - "))}
        {item("CEP", pac.cep)}
        {!pac.endereco && !pac.cidade && <p className="muted">Não informado.</p>}
      </div>
      <div className="card">
        <h3>Financeiro</h3>
        <div className="dado"><span>Em aberto</span><b className={pendente > 0 ? "alerta" : ""}>{money(pendente)}</b></div>
        {item("Convênio", pac.convenio)}
        {item("Indicação", pac.indicacao)}
      </div>
      {pac.observacoes && <div className="card wide"><h3>Observações</h3><p>{pac.observacoes}</p></div>}
    </div>
  );
}

function HistoricoConsultas({ pacienteId }: { pacienteId: number }) {
  const [lista, setLista] = useState<Agendamento[]>([]);
  useEffect(() => { db<Agendamento[]>("proximosAgendamentos", pacienteId).then(setLista); }, [pacienteId]);
  if (lista.length === 0) return <Empty icon="calendar">Nenhuma consulta registrada.</Empty>;
  return (
    <table className="tabela">
      <thead><tr><th>Data</th><th>Profissional</th><th>Procedimento</th><th>Status</th></tr></thead>
      <tbody>
        {lista.map((a) => {
          const st = STATUS_AGENDA[a.status];
          return (
            <tr key={a.id}>
              <td>{formatarDataHora(a.inicio)}</td>
              <td>{a.profissional_nome || "—"}</td>
              <td>{a.procedimento || "—"}</td>
              <td><span className="status" style={{ background: st.cor + "22", color: st.cor }}>{st.nome}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function formatarDataHora(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || "");
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : s;
}
