import { useEffect, useMemo, useState } from "react";
import { Field, Modal, confirmar } from "../components/ui.tsx";
import { STATUS_AGENDA, addMinutes, hm, overlaps, pad, parseDateTime, ymd } from "../domain.ts";
import { acao, db, useApp } from "../store.ts";
import type { Agendamento, Paciente } from "../types.ts";

const HORA_INI = 7, HORA_FIM = 21, SLOT = 30; // grade de 30 min, 7h às 21h
const PX_MIN = 0.9; // pixels por minuto

function semanaDe(d: Date): Date[] {
  const base = new Date(d);
  base.setDate(base.getDate() - base.getDay()); // domingo
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(base); x.setDate(base.getDate() + i); return x; });
}
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Agenda() {
  const profissionais = useApp((s) => s.profissionais);
  const [data, setData] = useState(new Date());
  const [modo, setModo] = useState<"dia" | "semana">("dia");
  const [profFiltro, setProfFiltro] = useState<number | "todos">("todos");
  const [itens, setItens] = useState<Agendamento[]>([]);
  const [editar, setEditar] = useState<Partial<Agendamento> | null>(null);

  const dias = modo === "dia" ? [data] : semanaDe(data);
  const carregar = () => {
    const de = `${ymd(dias[0])} 00:00`;
    const ate = `${ymd(dias[dias.length - 1])} 23:59`;
    db<Agendamento[]>("listAgendamentos", de, ate).then(setItens);
  };
  useEffect(() => void carregar(), [data, modo]);

  const filtrados = itens.filter((a) => profFiltro === "todos" || a.profissional_id === profFiltro);

  const navegar = (dir: number) => {
    const d = new Date(data);
    d.setDate(d.getDate() + dir * (modo === "dia" ? 1 : 7));
    setData(d);
  };

  const novoEm = (dia: Date, minutos: number) => {
    const inicio = `${ymd(dia)} ${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;
    setEditar({ inicio, fim: addMinutes(inicio, SLOT), status: "agendado", profissional_id: profFiltro === "todos" ? profissionais[0]?.id ?? null : profFiltro });
  };

  const horas: number[] = [];
  for (let h = HORA_INI; h <= HORA_FIM; h++) horas.push(h);

  return (
    <div className="agenda">
      <div className="page-head">
        <h1>Agenda</h1>
        <div className="row">
          <div className="seg">
            <button className={modo === "dia" ? "on" : ""} onClick={() => setModo("dia")}>Dia</button>
            <button className={modo === "semana" ? "on" : ""} onClick={() => setModo("semana")}>Semana</button>
          </div>
          <select value={String(profFiltro)} onChange={(e) => setProfFiltro(e.target.value === "todos" ? "todos" : Number(e.target.value))}>
            <option value="todos">Todos os profissionais</option>
            {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <button className="primary" onClick={() => novoEm(data, 9 * 60)}>+ Nova consulta</button>
        </div>
      </div>

      <div className="agenda-nav">
        <button onClick={() => navegar(-1)}>‹</button>
        <button onClick={() => setData(new Date())}>Hoje</button>
        <button onClick={() => navegar(1)}>›</button>
        <b>{modo === "dia"
          ? data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
          : `${dias[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${dias[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}</b>
      </div>

      <div className="agenda-grade" style={{ ["--slot" as string]: `${SLOT * PX_MIN}px` }}>
        <div className="col-horas">
          <div className="dia-cabecalho" />
          {horas.map((h) => <div key={h} className="hora-label" style={{ height: 60 * PX_MIN }}>{pad(h)}:00</div>)}
        </div>
        {dias.map((dia) => {
          const doDia = filtrados.filter((a) => a.inicio.slice(0, 10) === ymd(dia));
          const hoje = ymd(dia) === ymd(new Date());
          return (
            <div className={"col-dia" + (hoje ? " hoje" : "")} key={ymd(dia)}>
              <div className="dia-cabecalho">
                {modo === "semana" && <span className="dia-semana">{DIAS[dia.getDay()]}</span>}
                <span className="dia-num">{dia.getDate()}</span>
              </div>
              <div className="dia-slots" style={{ height: (HORA_FIM - HORA_INI + 1) * 60 * PX_MIN }}>
                {horas.map((h) => [0, SLOT].map((m) => (
                  <div key={`${h}-${m}`} className="slot" style={{ top: ((h - HORA_INI) * 60 + m) * PX_MIN, height: SLOT * PX_MIN }}
                    onClick={() => novoEm(dia, h * 60 + m)} />
                )))}
                {doDia.map((a) => <Bloco key={a.id} a={a} onClick={() => setEditar(a)} compacto={modo === "semana"} />)}
              </div>
            </div>
          );
        })}
      </div>

      {editar && <ConsultaModal inicial={editar} onClose={() => setEditar(null)} onSalvo={() => (setEditar(null), carregar())}
        existentes={itens} />}
    </div>
  );
}

function Bloco({ a, onClick, compacto }: { a: Agendamento; onClick(): void; compacto: boolean }) {
  const ini = parseDateTime(a.inicio);
  const fim = parseDateTime(a.fim);
  if (!ini || !fim) return null;
  const topMin = (ini.getHours() - HORA_INI) * 60 + ini.getMinutes();
  const dur = Math.max(20, (fim.getTime() - ini.getTime()) / 60000);
  const cor = a.status === "cancelado" || a.status === "faltou" ? STATUS_AGENDA[a.status].cor : (a.profissional_cor || "#2a7de1");
  return (
    <div className={"bloco st-" + a.status} style={{ top: topMin * PX_MIN, height: dur * PX_MIN, background: cor + "1c", borderColor: cor }}
      onClick={(e) => (e.stopPropagation(), onClick())}>
      <div className="bloco-hora">{hm(ini)}</div>
      <div className="bloco-pac">{a.paciente_nome || "(sem paciente)"}</div>
      {!compacto && <div className="bloco-proc">{a.procedimento || STATUS_AGENDA[a.status].nome}</div>}
    </div>
  );
}

function ConsultaModal({ inicial, onClose, onSalvo, existentes }: {
  inicial: Partial<Agendamento>; onClose(): void; onSalvo(): void; existentes: Agendamento[];
}) {
  const profissionais = useApp((s) => s.profissionais);
  const procedimentos = useApp((s) => s.procedimentos);
  const [a, setA] = useState<Partial<Agendamento>>(inicial);
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Paciente[]>([]);
  const [pacNome, setPacNome] = useState(inicial.paciente_nome || "");
  const [erro, setErro] = useState("");
  const editando = !!inicial.id;

  useEffect(() => {
    if (!busca.trim()) return setAchados([]);
    const id = setTimeout(() => db<Paciente[]>("listPacientes", busca).then((r) => setAchados(r.slice(0, 6))), 200);
    return () => clearTimeout(id);
  }, [busca]);

  const dia = (inicial.inicio || "").slice(0, 10);
  const horaIni = (inicial.inicio || "").slice(11, 16);
  const [date, setDate] = useState(dia);
  const [hora, setHora] = useState(horaIni);
  const [dur, setDur] = useState(() => {
    const i = parseDateTime(inicial.inicio || ""), f = parseDateTime(inicial.fim || "");
    return i && f ? Math.round((f.getTime() - i.getTime()) / 60000) : 30;
  });

  const salvar = async () => {
    if (!a.paciente_id) return setErro("Escolha o paciente.");
    if (!date || !hora) return setErro("Informe data e horário.");
    const inicio = `${date} ${hora}`;
    const fim = addMinutes(inicio, dur);
    const conflito = existentes.find((x) => x.id !== a.id && x.profissional_id === a.profissional_id && x.status !== "cancelado" && overlaps(inicio, fim, x.inicio, x.fim));
    if (conflito && !(await confirmar(`Esse horário conflita com ${conflito.paciente_nome || "outra consulta"} (${conflito.inicio.slice(11, 16)}). Agendar mesmo assim?`, false))) return;
    const dados = { ...a, inicio, fim };
    delete (dados as { paciente_nome?: string }).paciente_nome;
    delete (dados as { profissional_nome?: string }).profissional_nome;
    delete (dados as { profissional_cor?: string }).profissional_cor;
    await acao(() => db("saveAgendamento", dados), editando ? "Consulta atualizada." : "Consulta agendada.");
    onSalvo();
  };

  const excluir = async () => {
    if (await confirmar("Excluir esta consulta?")) {
      await db("deleteAgendamento", a.id);
      onSalvo();
    }
  };

  return (
    <Modal title={editando ? "Consulta" : "Nova consulta"} onClose={onClose}>
      {a.paciente_id ? (
        <div className="pac-escolhido">
          <b>{pacNome}</b>
          <button className="link" onClick={() => (setA({ ...a, paciente_id: null }), setPacNome(""))}>trocar</button>
        </div>
      ) : (
        <Field label="Paciente *">
          <input placeholder="Buscar paciente…" value={busca} autoFocus onChange={(e) => setBusca(e.target.value)} />
          {achados.length > 0 && (
            <div className="autocomplete">
              {achados.map((p) => (
                <button key={p.id} onClick={() => { setA({ ...a, paciente_id: p.id }); setPacNome(p.nome); setBusca(""); }}>{p.nome}</button>
              ))}
            </div>
          )}
        </Field>
      )}
      <div className="row">
        <Field label="Data"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Hora"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} step={300} /></Field>
        <Field label="Duração (min)"><input type="number" min={10} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></Field>
      </div>
      <Field label="Profissional">
        <select value={a.profissional_id ?? ""} onChange={(e) => setA({ ...a, profissional_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">—</option>
          {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>
      <Field label="Procedimento">
        <input list="procs" value={a.procedimento || ""} onChange={(e) => setA({ ...a, procedimento: e.target.value })} placeholder="Avaliação, limpeza…" />
        <datalist id="procs">{procedimentos.map((p) => <option key={p.id} value={p.nome} />)}</datalist>
      </Field>
      <Field label="Status">
        <div className="status-btns">
          {Object.entries(STATUS_AGENDA).map(([k, v]) => (
            <button key={k} className={"st-pick" + (a.status === k ? " on" : "")} style={a.status === k ? { background: v.cor, borderColor: v.cor, color: "#fff" } : {}}
              onClick={() => setA({ ...a, status: k })}>{v.nome}</button>
          ))}
        </div>
      </Field>
      <Field label="Observações"><textarea rows={2} value={a.observacoes || ""} onChange={(e) => setA({ ...a, observacoes: e.target.value })} /></Field>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="row between">
        <span>{editando && <button className="danger" onClick={excluir}>Excluir</button>}</span>
        <span className="row">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={salvar}>Salvar</button>
        </span>
      </div>
    </Modal>
  );
}
