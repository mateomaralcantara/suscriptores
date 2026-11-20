"use client";

import { useMemo, useState } from "react";
import { simulate, type SimulationInput } from "@/lib/simulator";
import { SAMPLING_DESIGNS } from "@/lib/project-rules";
import { Warnings } from "./Warnings";

function parseStrata(text: string): { strata: Record<string, number> | null; error: string | null } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { strata: null, error: null };
  const strata: Record<string, number> = {};
  for (const line of lines) {
    const match = line.match(/^(.+?)[:;,\t]\s*([\d.\s]+)$/);
    const size = match ? Number(match[2].replace(/[.\s]/g, "")) : Number.NaN;
    if (!match || !Number.isFinite(size) || size < 0) return { strata: null, error: `Línea no válida: «${line}». Use «nombre: tamaño».` };
    strata[match[1].trim()] = size;
  }
  return { strata, error: null };
}

const pct = (x: number) => `${(x * 100).toLocaleString("es-DO", { maximumFractionDigits: 2 })}`;

export function SimulatorForm() {
  const [design, setDesign] = useState<SimulationInput["design"]>("probabilistico");
  const [moe, setMoe] = useState("3");
  const [confidence, setConfidence] = useState("0.95");
  const [population, setPopulation] = useState("");
  const [deff, setDeff] = useState("1.5");
  const [responseRate, setResponseRate] = useState("");
  const [planned, setPlanned] = useState("");
  const [strataText, setStrataText] = useState("");
  const [minimum, setMinimum] = useState("0");
  const [interviewers, setInterviewers] = useState("");
  const [perDay, setPerDay] = useState("");
  const [digital, setDigital] = useState(false);

  const parsed = parseStrata(strataText);
  const outcome = useMemo(() => {
    const n = (v: string) => (v.trim() === "" ? null : Number(v));
    try {
      return {
        result: simulate({
          design,
          methods: digital ? ["escucha_social"] : [],
          marginOfError: design === "probabilistico" && n(moe) ? Number(moe) / 100 : null,
          confidence: Number(confidence),
          populationSize: n(population),
          designEffect: n(deff) ?? 1,
          responseRate: n(responseRate) ? Number(responseRate) / 100 : null,
          plannedSampleSize: design === "probabilistico" && n(moe) ? null : n(planned),
          strata: parsed.strata,
          minimumPerStratum: n(minimum) ?? 0,
          interviewers: n(interviewers),
          completesPerInterviewerDay: n(perDay),
        }),
        error: null,
      };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Parámetros no válidos." };
    }
  }, [design, moe, confidence, population, deff, responseRate, planned, parsed.strata, minimum, interviewers, perDay, digital]);

  const r = outcome.result;
  return (
    <div className="grid cols-2">
      <form className="card form" onSubmit={(e) => e.preventDefault()} aria-label="Parámetros">
        <div className="field">
          <label htmlFor="s-design">Diseño muestral</label>
          <select id="s-design" value={design} onChange={(e) => setDesign(e.target.value as SimulationInput["design"])}>
            {Object.entries(SAMPLING_DESIGNS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {design === "probabilistico" ? (
          <div className="form-row">
            <div className="field">
              <label htmlFor="s-moe">Margen de error (puntos)</label>
              <input id="s-moe" type="number" min="0.1" max="50" step="0.1" value={moe} onChange={(e) => setMoe(e.target.value)} />
              <span className="hint">Vacío para fijar n manualmente.</span>
            </div>
            <div className="field">
              <label htmlFor="s-conf">Confianza</label>
              <select id="s-conf" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                {["0.8", "0.9", "0.95", "0.99"].map((c) => <option key={c} value={c}>{Math.round(Number(c) * 100)} %</option>)}
              </select>
            </div>
          </div>
        ) : null}
        {design !== "probabilistico" || moe.trim() === "" ? (
          <div className="field">
            <label htmlFor="s-n">Tamaño de muestra previsto</label>
            <input id="s-n" type="number" min="1" step="1" value={planned} onChange={(e) => setPlanned(e.target.value)} />
          </div>
        ) : null}
        <div className="form-row">
          <div className="field">
            <label htmlFor="s-pop">Población (opcional)</label>
            <input id="s-pop" type="number" min="1" step="1" value={population} onChange={(e) => setPopulation(e.target.value)} />
            <span className="hint">Activa la corrección por población finita.</span>
          </div>
          <div className="field">
            <label htmlFor="s-deff">Efecto de diseño esperado</label>
            <input id="s-deff" type="number" min="1" step="0.1" value={deff} onChange={(e) => setDeff(e.target.value)} />
            <span className="hint">1 = aleatorio simple. Conglomerados y ponderación lo elevan.</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="s-rr">Tasa de respuesta esperada (%)</label>
          <input id="s-rr" type="number" min="1" max="100" step="1" value={responseRate} onChange={(e) => setResponseRate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-strata">Estratos (uno por línea: «nombre: tamaño de población»)</label>
          <textarea id="s-strata" value={strataText} onChange={(e) => setStrataText(e.target.value)} placeholder={"Urbano: 70000\nRural: 30000"} />
          <span className="hint">Introduzca tamaños de una fuente oficial citada (p. ej., censo de la ONE). El simulador no inventa poblaciones.</span>
          {parsed.error ? <span className="error">{parsed.error}</span> : null}
        </div>
        <div className="field">
          <label htmlFor="s-min">Mínimo por estrato</label>
          <input id="s-min" type="number" min="0" step="1" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="s-int">Encuestadores</label>
            <input id="s-int" type="number" min="1" step="1" value={interviewers} onChange={(e) => setInterviewers(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s-day">Entrevistas por encuestador y día</label>
            <input id="s-day" type="number" min="1" step="1" value={perDay} onChange={(e) => setPerDay(e.target.value)} />
          </div>
        </div>
        <label className="small"><input type="checkbox" checked={digital} onChange={(e) => setDigital(e.target.checked)} /> El estudio incluye escucha social</label>
      </form>

      <section className="card" aria-live="polite" aria-label="Resultado">
        <h2>Resultado</h2>
        {outcome.error ? <div className="alert error">{outcome.error}</div> : null}
        {r ? (
          <>
            <dl className="dl">
              <dt>Entrevistas completas</dt><dd><strong>{r.sampleSize?.toLocaleString("es-DO") ?? "—"}</strong></dd>
              <dt>Contactos estimados</dt><dd>{r.contactsNeeded?.toLocaleString("es-DO") ?? "—"}</dd>
              <dt>Margen de error alcanzado</dt>
              <dd>
                {r.achievedMargin === null ? "—" : r.achievedMargin.applicable
                  ? <>±{pct(r.achievedMargin.value)} puntos <span className="muted small">(n efectivo ≈ {Math.round(r.achievedMargin.effectiveN).toLocaleString("es-DO")})</span></>
                  : <span className="badge warn">No aplica</span>}
              </dd>
              <dt>Días de campo</dt><dd>{r.fieldworkDays ?? "—"}</dd>
            </dl>
            {r.achievedMargin && !r.achievedMargin.applicable ? <p className="small muted" style={{ marginTop: ".75rem" }}>{r.achievedMargin.reason}</p> : null}
            {r.allocation ? (
              <div className="table-wrap" style={{ marginTop: "1rem" }}>
                <table>
                  <caption className="sr-only">Asignación proporcional por estrato</caption>
                  <thead><tr><th>Estrato</th><th className="num">Población</th><th className="num">Entrevistas</th></tr></thead>
                  <tbody>
                    {Object.entries(r.allocation).map(([k, v]) => (
                      <tr key={k}><td>{k}</td><td className="num">{parsed.strata?.[k]?.toLocaleString("es-DO")}</td><td className="num">{v.toLocaleString("es-DO")}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="small muted">Asignación proporcional (mayor residuo) con el mínimo indicado. Las estimaciones nacionales requieren ponderar por estrato.</p>
              </div>
            ) : null}
            <Warnings items={r.warnings} />
            <p className="small muted">Fórmula: n = z²·p(1−p)/e² × efecto de diseño, con corrección por población finita. Supone p = 0,5 (caso más conservador). Herramienta de planificación; no sustituye la revisión de un metodólogo.</p>
          </>
        ) : null}
      </section>
    </div>
  );
}
