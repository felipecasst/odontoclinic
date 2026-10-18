import { useEffect, useState } from "react";
import { confirmar } from "../components/ui.tsx";
import { acao, db, useApp } from "../store.ts";
import type { Evolucao } from "../types.ts";

export function EvolucaoClinica({ pacienteId }: { pacienteId: number }) {
  const profissionais = useApp((s) => s.profissionais);
  const [lista, setLista] = useState<Evolucao[]>([]);
  const [texto, setTexto] = useState("");
  const [dente, setDente] = useState("");
  const [prof, setProf] = useState<number | "">("");

  const carregar = () => db<Evolucao[]>("listEvolucoes", pacienteId).then(setLista);
  useEffect(() => void carregar(), [pacienteId]);

  const adicionar = async () => {
    if (!texto.trim()) return;
    await acao(() => db("addEvolucao", {
      paciente_id: pacienteId, profissional_id: prof || null, texto: texto.trim(), dente: dente.trim(),
      data: new Date().toISOString().slice(0, 19).replace("T", " "),
    }), "Evolução registrada.");
    setTexto("");
    setDente("");
    carregar();
  };

  return (
    <div className="evolucao">
      <div className="nova-evo">
        <textarea rows={3} placeholder="Descreva o atendimento, queixa, conduta…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="row">
          <input className="mini" placeholder="Dente" value={dente} onChange={(e) => setDente(e.target.value)} />
          <select value={prof} onChange={(e) => setProf(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Profissional…</option>
            {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <button className="primary" onClick={adicionar}>Registrar</button>
        </div>
      </div>
      <div className="timeline-evo">
        {lista.length === 0 && <p className="muted">Nenhum registro ainda.</p>}
        {lista.map((e) => (
          <div className="evo-item" key={e.id}>
            <div className="evo-data">{formatarData(e.data)}</div>
            <div className="evo-corpo">
              <p>{e.texto}</p>
              <div className="evo-meta">
                {e.dente && <span>Dente {e.dente}</span>}
                {e.profissional_nome && <span>{e.profissional_nome}</span>}
                <button className="link danger" onClick={async () => { if (await confirmar("Excluir este registro?")) db("deleteEvolucao", e.id).then(carregar); }}>Excluir</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatarData(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || "");
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : s;
}
