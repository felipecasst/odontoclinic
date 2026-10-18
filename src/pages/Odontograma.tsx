import { useEffect, useMemo, useState } from "react";
import { confirmar } from "../components/ui.tsx";
import { CONDICOES, QUADRANTES_DECIDUOS, QUADRANTES_PERM, condicao } from "../domain.ts";
import { acao, db } from "../store.ts";
import type { OdontoMarca } from "../types.ts";

// Um dente desenhado como 5 faces: centro (oclusal) e 4 lados.
function Dente({ numero, marcas, onFace, onDente }: {
  numero: string; marcas: OdontoMarca[]; onFace(face: string): void; onDente(): void;
}) {
  const cor = (face: string) => {
    const m = marcas.find((x) => x.face === face);
    return m ? condicao(m.tipo)?.cor ?? "#888" : "";
  };
  const inteiro = marcas.find((m) => !m.face && condicao(m.tipo)?.denteInteiro);
  const corInteiro = inteiro ? condicao(inteiro.tipo)?.cor : null;
  const faceStyle = (f: string) => ({ fill: cor(f) || "#fff" });
  const s = 34, g = 10; // tamanho total e lado do quadrado central
  const mid = (s - g) / 2;
  return (
    <div className="dente" title={`Dente ${numero}`}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} onContextMenu={(e) => (e.preventDefault(), onDente())}>
        {/* Vestibular (cima), Lingual (baixo), Mesial/Distal laterais, Oclusal (centro) */}
        <polygon points={`0,0 ${s},0 ${s - mid},${mid} ${mid},${mid}`} style={faceStyle("V")} onClick={() => onFace("V")} />
        <polygon points={`0,${s} ${s},${s} ${s - mid},${s - mid} ${mid},${s - mid}`} style={faceStyle("L")} onClick={() => onFace("L")} />
        <polygon points={`0,0 ${mid},${mid} ${mid},${s - mid} 0,${s}`} style={faceStyle("M")} onClick={() => onFace("M")} />
        <polygon points={`${s},0 ${s - mid},${mid} ${s - mid},${s - mid} ${s},${s}`} style={faceStyle("D")} onClick={() => onFace("D")} />
        <rect x={mid} y={mid} width={g} height={g} style={faceStyle("O")} onClick={() => onFace("O")} />
        {corInteiro && <rect x={1} y={1} width={s - 2} height={s - 2} fill="none" stroke={corInteiro} strokeWidth={3} onClick={onDente} />}
        {inteiro?.tipo === "ausente" && <line x1={3} y1={3} x2={s - 3} y2={s - 3} stroke="#777" strokeWidth={2} />}
      </svg>
      <div className="dente-num">{numero}</div>
    </div>
  );
}

export function Odontograma({ pacienteId }: { pacienteId: number }) {
  const [marcas, setMarcas] = useState<OdontoMarca[]>([]);
  const [deciduos, setDeciduos] = useState(false);
  const [sel, setSel] = useState<{ dente: string; face: string } | null>(null);

  const carregar = () => db<OdontoMarca[]>("listOdontograma", pacienteId).then(setMarcas);
  useEffect(() => void carregar(), [pacienteId]);

  const porDente = useMemo(() => {
    const map = new Map<string, OdontoMarca[]>();
    for (const m of marcas) (map.get(m.dente) ?? map.set(m.dente, []).get(m.dente)!).push(m);
    return map;
  }, [marcas]);

  const aplicar = async (dente: string, face: string, tipo: string, estado: string) => {
    const existente = marcas.find((m) => m.dente === dente && m.face === face && m.tipo === tipo);
    if (existente) await acao(() => db("deleteOdontograma", existente.id));
    else await acao(() => db("addOdontograma", { paciente_id: pacienteId, dente, face, tipo, estado, cor: "", observacao: "" }));
    setSel(null);
    carregar();
  };

  const linhas = deciduos ? QUADRANTES_DECIDUOS : QUADRANTES_PERM;
  const [sup, setSup] = [linhas.slice(0, 2), linhas.slice(2)];

  return (
    <div className="odontograma">
      <div className="odo-toolbar">
        <div className="seg">
          <button className={!deciduos ? "on" : ""} onClick={() => setDeciduos(false)}>Permanentes</button>
          <button className={deciduos ? "on" : ""} onClick={() => setDeciduos(true)}>Decíduos (leite)</button>
        </div>
        <span className="hint">Clique numa face para marcar. Clique com o botão direito no dente para marcações do dente todo.</span>
      </div>
      <div className="arcada">
        <div className="arco">
          {sup.map((q, i) => (
            <div className="quad" key={i}>
              {q.map((d) => (
                <Dente key={d} numero={d} marcas={porDente.get(d) ?? []}
                  onFace={(f) => setSel({ dente: d, face: f })} onDente={() => setSel({ dente: d, face: "" })} />
              ))}
            </div>
          ))}
        </div>
        <div className="arco inferior">
          {setSup.map((q, i) => (
            <div className="quad" key={i}>
              {q.map((d) => (
                <Dente key={d} numero={d} marcas={porDente.get(d) ?? []}
                  onFace={(f) => setSel({ dente: d, face: f })} onDente={() => setSel({ dente: d, face: "" })} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {sel && (
        <div className="odo-picker">
          <div className="odo-picker-head">
            Dente {sel.dente}{sel.face ? ` · face ${sel.face}` : " · dente todo"}
            <button className="icon-btn" onClick={() => setSel(null)}>✕</button>
          </div>
          <div className="cond-grid">
            {CONDICOES.filter((c) => (sel.face ? !c.denteInteiro : c.denteInteiro)).map((c) => {
              const ativo = marcas.some((m) => m.dente === sel.dente && m.face === sel.face && m.tipo === c.id);
              return (
                <button key={c.id} className={"cond" + (ativo ? " on" : "")} onClick={() => aplicar(sel.dente, sel.face, c.id, "existente")}>
                  <i style={{ background: c.cor }} /> {c.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Legenda />
      {marcas.length > 0 && (
        <div className="odo-lista">
          <div className="odo-lista-head">
            <b>Marcações ({marcas.length})</b>
            <button className="link danger" onClick={async () => {
              if (await confirmar("Apagar todas as marcações deste odontograma?")) {
                for (const m of marcas) await db("deleteOdontograma", m.id);
                carregar();
              }
            }}>Limpar tudo</button>
          </div>
          <div className="chips">
            {marcas.map((m) => (
              <span key={m.id} className="chip" style={{ borderColor: condicao(m.tipo)?.cor }}>
                {m.dente}{m.face ? `·${m.face}` : ""} {condicao(m.tipo)?.nome}
                <button onClick={() => db("deleteOdontograma", m.id).then(carregar)}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legenda() {
  return (
    <div className="legenda">
      {CONDICOES.map((c) => (
        <span key={c.id}><i style={{ background: c.cor }} /> {c.nome}</span>
      ))}
    </div>
  );
}
