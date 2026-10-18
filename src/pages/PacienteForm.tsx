import { useState } from "react";
import { Field, Modal } from "../components/ui.tsx";
import { formatCPF, formatPhone, isValidCPF, onlyDigits } from "../domain.ts";
import { acao, db } from "../store.ts";
import type { Paciente } from "../types.ts";

const vazio = (): Partial<Paciente> => ({
  nome: "", cpf: "", nascimento: "", sexo: "", telefone: "", email: "", cep: "", endereco: "", numero: "",
  bairro: "", cidade: "", uf: "", convenio: "", indicacao: "", observacoes: "",
});

export function PacienteForm({ paciente, onClose, onSaved }: {
  paciente: Paciente | null; onClose(): void; onSaved(id: number): void;
}) {
  const [p, setP] = useState<Partial<Paciente>>(paciente ?? vazio());
  const set = (k: keyof Paciente, v: string) => setP((old) => ({ ...old, [k]: v }));
  const [erro, setErro] = useState("");

  const salvar = async () => {
    if (!p.nome?.trim()) return setErro("Informe o nome do paciente.");
    if (p.cpf && !isValidCPF(p.cpf)) return setErro("CPF inválido.");
    const dados = { ...p, cpf: onlyDigits(p.cpf || ""), telefone: onlyDigits(p.telefone || "") };
    const id = await acao(() => db<number>("savePaciente", dados), paciente ? "Paciente atualizado." : "Paciente cadastrado.");
    if (id != null) onSaved(typeof id === "number" ? id : paciente!.id);
  };

  return (
    <Modal title={paciente ? "Editar paciente" : "Novo paciente"} onClose={onClose} wide>
      <div className="form-grid">
        <Field label="Nome completo *" wide>
          <input value={p.nome || ""} autoFocus onChange={(e) => set("nome", e.target.value)} />
        </Field>
        <Field label="CPF">
          <input value={formatCPF(p.cpf || "")} onChange={(e) => set("cpf", e.target.value)}
            className={p.cpf && !isValidCPF(p.cpf) ? "invalid" : ""} placeholder="000.000.000-00" />
        </Field>
        <Field label="Nascimento">
          <input type="date" value={p.nascimento || ""} onChange={(e) => set("nascimento", e.target.value)} />
        </Field>
        <Field label="Sexo">
          <select value={p.sexo || ""} onChange={(e) => set("sexo", e.target.value)}>
            <option value="">—</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
            <option value="O">Outro</option>
          </select>
        </Field>
        <Field label="Telefone / WhatsApp">
          <input value={formatPhone(p.telefone || "")} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
        </Field>
        <Field label="E-mail">
          <input value={p.email || ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Convênio">
          <input value={p.convenio || ""} onChange={(e) => set("convenio", e.target.value)} placeholder="Particular, Amil…" />
        </Field>
        <Field label="CEP">
          <input value={p.cep || ""} onChange={(e) => set("cep", e.target.value)} />
        </Field>
        <Field label="Endereço" wide>
          <input value={p.endereco || ""} onChange={(e) => set("endereco", e.target.value)} />
        </Field>
        <Field label="Número">
          <input value={p.numero || ""} onChange={(e) => set("numero", e.target.value)} />
        </Field>
        <Field label="Bairro">
          <input value={p.bairro || ""} onChange={(e) => set("bairro", e.target.value)} />
        </Field>
        <Field label="Cidade">
          <input value={p.cidade || ""} onChange={(e) => set("cidade", e.target.value)} />
        </Field>
        <Field label="UF">
          <input value={p.uf || ""} maxLength={2} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Como conheceu a clínica">
          <input value={p.indicacao || ""} onChange={(e) => set("indicacao", e.target.value)} placeholder="Indicação, Instagram…" />
        </Field>
        <Field label="Observações" wide>
          <textarea rows={2} value={p.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
        </Field>
      </div>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="row end">
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={salvar}>Salvar</button>
      </div>
    </Modal>
  );
}
