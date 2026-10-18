import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon.tsx";

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={"field" + (wide ? " wide" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose(): void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={40} color="#b7c0d4" /></div>
      <div>{children}</div>
    </div>
  );
}

export function Badge({ cor, children }: { cor: string; children: ReactNode }) {
  return <span className="badge" style={{ background: cor + "22", color: cor }}>{children}</span>;
}

/** Confirmação simples (promessa). Uso: if (await confirmar("Excluir?")) … */
let confirmResolver: ((v: boolean) => void) | null = null;
let setConfirmState: ((s: { texto: string; perigo: boolean } | null) => void) | null = null;

export function confirmar(texto: string, perigo = true): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    setConfirmState?.({ texto, perigo });
  });
}

export function ConfirmHost() {
  const [state, setState] = useStateHost();
  setConfirmState = setState;
  if (!state) return null;
  const done = (v: boolean) => {
    confirmResolver?.(v);
    confirmResolver = null;
    setState(null);
  };
  return (
    <div className="modal-backdrop" onMouseDown={() => done(false)}>
      <div className="modal confirm">
        <div className="modal-body">
          <p>{state.texto}</p>
          <div className="row end">
            <button onClick={() => done(false)}>Cancelar</button>
            <button className={state.perigo ? "danger" : "primary"} onClick={() => done(true)} autoFocus>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
function useStateHost() {
  return useState<{ texto: string; perigo: boolean } | null>(null);
}
