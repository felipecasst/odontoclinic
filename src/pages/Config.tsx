import { useEffect, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { Field, Modal, confirmar } from "../components/ui.tsx";
import { money } from "../domain.ts";
import { acao, db, useApp } from "../store.ts";
import type { Clinica, Procedimento, Profissional } from "../types.ts";

const CORES = ["#2a7de1", "#e53935", "#00897b", "#8e24aa", "#fb8c00", "#43a047", "#5e35b1", "#d81b60"];

export function Config() {
  const [sub, setSub] = useState<"clinica" | "profissionais" | "procedimentos" | "backup">("clinica");
  return (
    <div className="config">
      <div className="page-head"><h1>Configurações</h1></div>
      <div className="abas">
        {([["clinica", "Clínica"], ["profissionais", "Profissionais"], ["procedimentos", "Tabela de preços"], ["backup", "Backup e dados"]] as const).map(([k, v]) => (
          <button key={k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{v}</button>
        ))}
      </div>
      <div className="aba-conteudo">
        {sub === "clinica" && <ClinicaForm />}
        {sub === "profissionais" && <ProfissionaisTab />}
        {sub === "procedimentos" && <ProcedimentosTab />}
        {sub === "backup" && <BackupTab />}
      </div>
    </div>
  );
}

function ClinicaForm() {
  const [c, setC] = useState<Clinica | null>(null);
  useEffect(() => { db<Clinica>("getConfig").then(setC); }, []);
  if (!c) return null;
  const set = (k: keyof Clinica, v: string) => setC({ ...c, [k]: v });
  const salvar = async () => {
    const { id, ...dados } = c;
    void id;
    await acao(() => db("saveConfig", dados), "Dados da clínica salvos.");
  };
  return (
    <div className="card form-card">
      <div className="form-grid">
        <Field label="Nome da clínica" wide><input value={c.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
        <Field label="CNPJ"><input value={c.cnpj} onChange={(e) => set("cnpj", e.target.value)} /></Field>
        <Field label="Telefone"><input value={c.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
        <Field label="Responsável técnico"><input value={c.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></Field>
        <Field label="CRO"><input value={c.cro} onChange={(e) => set("cro", e.target.value)} /></Field>
        <Field label="Endereço" wide><input value={c.endereco} onChange={(e) => set("endereco", e.target.value)} /></Field>
      </div>
      <div className="row end"><button className="primary" onClick={salvar}>Salvar</button></div>
    </div>
  );
}

function ProfissionaisTab() {
  const carregarApoio = useApp((s) => s.carregarApoio);
  const [lista, setLista] = useState<Profissional[]>([]);
  const [edit, setEdit] = useState<Partial<Profissional> | null>(null);
  const carregar = () => db<Profissional[]>("listProfissionais", true).then(setLista);
  useEffect(() => void carregar(), []);
  const salvar = async () => {
    if (!edit?.nome?.trim()) return;
    await acao(() => db("saveProfissional", edit), "Profissional salvo.");
    setEdit(null);
    carregar();
    carregarApoio();
  };
  return (
    <div>
      <div className="row end mb"><button className="primary" onClick={() => setEdit({ nome: "", cor: CORES[0], comissao: 0, ativo: 1 })}>+ Profissional</button></div>
      <table className="tabela">
        <thead><tr><th></th><th>Nome</th><th>CRO</th><th>Especialidade</th><th>Comissão</th><th></th></tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className={p.ativo ? "" : "inativo"}>
              <td><i className="cor-dot" style={{ background: p.cor }} /></td>
              <td>{p.nome}</td><td>{p.cro}</td><td>{p.especialidade}</td><td>{p.comissao}%</td>
              <td><button className="icon-btn" onClick={() => setEdit(p)}><Icon name="edit" size={15} /></button></td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan={6} className="muted center">Cadastre os dentistas da clínica.</td></tr>}
        </tbody>
      </table>
      {edit && (
        <Modal title={edit.id ? "Editar profissional" : "Novo profissional"} onClose={() => setEdit(null)}>
          <Field label="Nome *"><input value={edit.nome} autoFocus onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <div className="row">
            <Field label="CRO"><input value={edit.cro || ""} onChange={(e) => setEdit({ ...edit, cro: e.target.value })} /></Field>
            <Field label="Especialidade"><input value={edit.especialidade || ""} onChange={(e) => setEdit({ ...edit, especialidade: e.target.value })} /></Field>
          </div>
          <div className="row">
            <Field label="Telefone"><input value={edit.telefone || ""} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} /></Field>
            <Field label="Comissão (%)"><input type="number" value={edit.comissao || 0} onChange={(e) => setEdit({ ...edit, comissao: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Cor na agenda">
            <div className="cores">{CORES.map((c) => <button key={c} className={"cor-pick" + (edit.cor === c ? " on" : "")} style={{ background: c }} onClick={() => setEdit({ ...edit, cor: c })} />)}</div>
          </Field>
          <label className="check"><input type="checkbox" checked={!!edit.ativo} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked ? 1 : 0 })} /> Ativo</label>
          <div className="row end"><button onClick={() => setEdit(null)}>Cancelar</button><button className="primary" onClick={salvar}>Salvar</button></div>
        </Modal>
      )}
    </div>
  );
}

function ProcedimentosTab() {
  const carregarApoio = useApp((s) => s.carregarApoio);
  const [lista, setLista] = useState<Procedimento[]>([]);
  const [edit, setEdit] = useState<Partial<Procedimento> | null>(null);
  const carregar = () => db<Procedimento[]>("listProcedimentos", true).then(setLista);
  useEffect(() => void carregar(), []);
  const salvar = async () => {
    if (!edit?.nome?.trim()) return;
    await acao(() => db("saveProcedimento", edit), "Procedimento salvo.");
    setEdit(null);
    carregar();
    carregarApoio();
  };
  return (
    <div>
      <div className="row end mb"><button className="primary" onClick={() => setEdit({ nome: "", categoria: "", preco: 0, duracao: 30, ativo: 1 })}>+ Procedimento</button></div>
      <table className="tabela">
        <thead><tr><th>Procedimento</th><th>Categoria</th><th>Duração</th><th>Preço</th><th></th></tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className={p.ativo ? "" : "inativo"}>
              <td>{p.nome}</td><td>{p.categoria}</td><td>{p.duracao} min</td><td>{money(p.preco)}</td>
              <td><button className="icon-btn" onClick={() => setEdit(p)}><Icon name="edit" size={15} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {edit && (
        <Modal title={edit.id ? "Editar procedimento" : "Novo procedimento"} onClose={() => setEdit(null)}>
          <Field label="Nome *"><input value={edit.nome} autoFocus onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
          <div className="row">
            <Field label="Categoria"><input value={edit.categoria || ""} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })} /></Field>
            <Field label="Duração (min)"><input type="number" value={edit.duracao || 30} onChange={(e) => setEdit({ ...edit, duracao: Number(e.target.value) })} /></Field>
            <Field label="Preço (R$)"><input type="number" step="0.01" value={edit.preco || 0} onChange={(e) => setEdit({ ...edit, preco: Number(e.target.value) })} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={!!edit.ativo} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked ? 1 : 0 })} /> Ativo</label>
          <div className="row end"><button onClick={() => setEdit(null)}>Cancelar</button><button className="primary" onClick={salvar}>Salvar</button></div>
        </Modal>
      )}
    </div>
  );
}

function BackupTab() {
  const toast = useApp((s) => s.toast);
  const [info, setInfo] = useState<{ versao: string; dados: string } | null>(null);
  useEffect(() => { window.odonto.appInfo().then(setInfo); }, []);
  return (
    <div className="card form-card">
      <h3>Segurança dos dados</h3>
      <p className="muted">Todos os dados ficam neste computador, no arquivo do programa. Faça backups com frequência e guarde uma cópia em pen drive ou na nuvem.</p>
      <p className="muted small">O programa também faz um backup automático por dia (guarda os últimos 14) na pasta de dados.</p>
      <div className="row mt">
        <button className="primary" onClick={async () => { const p = await window.odonto.backupSave(); if (p) toast("Backup salvo em " + p); }}>Fazer backup agora</button>
        <button onClick={async () => { if (await confirmar("Restaurar um backup substitui todos os dados atuais. Continuar?")) window.odonto.backupRestore(); }}>Restaurar backup</button>
        <button onClick={() => window.odonto.openDataFolder()}>Abrir pasta de dados</button>
      </div>
      {info && <p className="muted small mt">Versão {info.versao} · Dados em: {info.dados}</p>}
    </div>
  );
}
