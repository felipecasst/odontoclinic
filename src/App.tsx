import { useEffect } from "react";
import { ConfirmHost } from "./components/ui.tsx";
import { Agenda } from "./pages/Agenda.tsx";
import { Config } from "./pages/Config.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Financeiro } from "./pages/Financeiro.tsx";
import { Pacientes } from "./pages/Pacientes.tsx";
import { Icon } from "./components/Icon.tsx";
import { useApp, type Aba } from "./store.ts";

const MENU: { id: Aba; nome: string; icone: string }[] = [
  { id: "dashboard", nome: "Início", icone: "home" },
  { id: "pacientes", nome: "Pacientes", icone: "users" },
  { id: "agenda", nome: "Agenda", icone: "calendar" },
  { id: "financeiro", nome: "Financeiro", icone: "wallet" },
  { id: "config", nome: "Configurações", icone: "gear" },
];

function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => <div key={t.id} className={"toast " + t.tipo}>{t.texto}</div>)}
    </div>
  );
}

export function App() {
  const aba = useApp((s) => s.aba);
  const irPara = useApp((s) => s.irPara);
  const carregarApoio = useApp((s) => s.carregarApoio);
  useEffect(() => { carregarApoio(); }, []);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo"><span className="logo-mark"><Icon name="tooth" size={22} /></span> OdontoClinic</div>
        {MENU.map((m) => (
          <button key={m.id} className={"nav-item" + (aba === m.id ? " on" : "")} onClick={() => irPara(m.id)}>
            <span className="nav-icone"><Icon name={m.icone} size={18} /></span> {m.nome}
          </button>
        ))}
        <div className="sidebar-rodape">Dados salvos neste computador</div>
      </nav>
      <main className="conteudo">
        {aba === "dashboard" && <Dashboard />}
        {aba === "pacientes" && <Pacientes />}
        {aba === "agenda" && <Agenda />}
        {aba === "financeiro" && <Financeiro />}
        {aba === "config" && <Config />}
      </main>
      <Toasts />
      <ConfirmHost />
    </div>
  );
}
