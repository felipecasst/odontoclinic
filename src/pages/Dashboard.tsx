import { useEffect, useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { STATUS_AGENDA, formatPhone, money, ymd } from "../domain.ts";
import { db, useApp } from "../store.ts";
import type { DashboardData } from "../types.ts";

export function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);
  const abrirPaciente = useApp((s) => s.abrirPaciente);
  const irPara = useApp((s) => s.irPara);

  useEffect(() => {
    const hoje = new Date();
    const ini = ymd(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    const fim = ymd(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
    db<DashboardData>("dashboard", ymd(hoje), ini, fim).then(setD);
  }, []);
  if (!d) return null;

  const nomeMes = new Date().toLocaleDateString("pt-BR", { month: "long" });
  const saldo = d.recebidoMes - d.despesasMes;

  return (
    <div className="dashboard">
      <div className="page-head"><h1>Início</h1><span className="muted">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span></div>

      <div className="cards-kpi">
        <Kpi titulo="Pacientes ativos" valor={String(d.pacientes)} icone="users" onClick={() => irPara("pacientes")} />
        <Kpi titulo={`Recebido em ${nomeMes}`} valor={money(d.recebidoMes)} icone="wallet" cor="#1e9e5a" onClick={() => irPara("financeiro")} />
        <Kpi titulo={`A receber em ${nomeMes}`} valor={money(d.aReceberMes)} icone="money" cor="#2a7de1" onClick={() => irPara("financeiro")} />
        <Kpi titulo={`Saldo de ${nomeMes}`} valor={money(saldo)} icone="chart" cor={saldo >= 0 ? "#1e9e5a" : "#e53935"} />
      </div>

      {d.vencidos.c > 0 && (
        <div className="aviso-vencidos" onClick={() => irPara("financeiro")}>
          <Icon name="warn" size={16} /> {d.vencidos.c} cobrança(s) vencida(s), somando {money(d.vencidos.v)}. Clique para ver.
        </div>
      )}

      <div className="dash-cols">
        <div className="card">
          <div className="card-head"><h3>Agenda de hoje</h3><button className="link" onClick={() => irPara("agenda")}>Ver agenda</button></div>
          {d.agendaHoje.length === 0 ? <p className="muted">Nenhuma consulta hoje.</p> : (
            <div className="hoje-lista">
              {d.agendaHoje.map((a) => {
                const st = STATUS_AGENDA[a.status];
                return (
                  <div className="hoje-item" key={a.id} onClick={() => a.paciente_id && abrirPaciente(a.paciente_id)}>
                    <span className="hoje-hora">{a.inicio.slice(11, 16)}</span>
                    <span className="hoje-barra" style={{ background: a.profissional_cor || "#2a7de1" }} />
                    <span className="hoje-pac">{a.paciente_nome || "(sem paciente)"}<small>{a.procedimento || ""}</small></span>
                    <span className="status" style={{ background: st.cor + "22", color: st.cor }}>{st.nome}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Aniversariantes de hoje</h3></div>
          {d.aniversariantes.length === 0 ? <p className="muted">Nenhum hoje.</p> : (
            <div className="aniver-lista">
              {d.aniversariantes.map((p) => (
                <div className="aniver-item" key={p.id} onClick={() => abrirPaciente(p.id)}>
                  <Icon name="cake" size={16} color="#d81b60" /> <b>{p.nome}</b>{p.telefone && <span className="muted">{formatPhone(p.telefone)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, icone, cor = "#334", onClick }: { titulo: string; valor: string; icone: string; cor?: string; onClick?(): void }) {
  return (
    <div className={"kpi" + (onClick ? " click" : "")} onClick={onClick}>
      <div className="kpi-icone" style={{ background: cor + "18", color: cor }}><Icon name={icone} size={22} color={cor} /></div>
      <div className="kpi-texto"><span>{titulo}</span><b style={{ color: cor }}>{valor}</b></div>
    </div>
  );
}
