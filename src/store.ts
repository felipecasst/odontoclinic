// Estado global simples: aba atual, paciente aberto, lista de apoio e avisos.
import { create } from "zustand";
import type { Procedimento, Profissional } from "./types.ts";

export type Aba = "dashboard" | "pacientes" | "agenda" | "financeiro" | "config";

const db = <T = unknown>(method: string, ...args: unknown[]) => window.odonto.db<T>(method, ...args);

interface Toast {
  id: number;
  texto: string;
  tipo: "ok" | "erro";
}

interface AppState {
  aba: Aba;
  pacienteId: number | null;
  profissionais: Profissional[];
  procedimentos: Procedimento[];
  toasts: Toast[];
  carregarApoio(): Promise<void>;
  irPara(aba: Aba): void;
  abrirPaciente(id: number): void;
  fecharPaciente(): void;
  toast(texto: string, tipo?: "ok" | "erro"): void;
  removerToast(id: number): void;
}

export const useApp = create<AppState>((set, get) => ({
  aba: "dashboard",
  pacienteId: null,
  profissionais: [],
  procedimentos: [],
  toasts: [],
  async carregarApoio() {
    const [profissionais, procedimentos] = await Promise.all([
      db<Profissional[]>("listProfissionais"),
      db<Procedimento[]>("listProcedimentos"),
    ]);
    set({ profissionais, procedimentos });
  },
  irPara: (aba) => set({ aba, pacienteId: aba === "pacientes" ? get().pacienteId : null }),
  abrirPaciente: (id) => set({ aba: "pacientes", pacienteId: id }),
  fecharPaciente: () => set({ pacienteId: null }),
  toast: (texto, tipo = "ok") => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, texto, tipo }] });
    setTimeout(() => get().removerToast(id), 4000);
  },
  removerToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Executa uma operação do banco mostrando erro amigável se falhar. */
export async function acao<T>(fn: () => Promise<T>, msgOk?: string): Promise<T | null> {
  try {
    const r = await fn();
    if (msgOk) useApp.getState().toast(msgOk);
    return r;
  } catch (err) {
    const m = String((err as Error).message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
    useApp.getState().toast(m, "erro");
    return null;
  }
}

export { db };
