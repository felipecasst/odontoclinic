import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { useApp } from "./store.ts";
import "./styles.css";

(window as unknown as { __app: typeof useApp }).__app = useApp;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
