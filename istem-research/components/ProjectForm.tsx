"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { send } from "@/lib/client-api";
import { assessInference, sampleSizeForProportion } from "@/lib/methodology";
import { CONFIDENCE_LEVELS, METHODS, OBJECTIVE_TYPES, SAMPLING_DESIGNS, validateProject } from "@/lib/project-rules";
import { Warnings } from "./Warnings";

export type ProjectFormValues = {
  title: string;
  research_question: string;
  objective_type: string;
  description: string;
  target_population: string;
  geo_area_codes: string[];
  methods: string[];
  sampling_design: string;
  planned_sample_size: string;
  moe_points: string;
  confidence_level: string;
  starts_on: string;
  ends_on: string;
};

const EMPTY: ProjectFormValues = {
  title: "", research_question: "", objective_type: "", description: "", target_population: "",
  geo_area_codes: [], methods: [], sampling_design: "por_definir", planned_sample_size: "",
  moe_points: "", confidence_level: "0.95", starts_on: "", ends_on: "",
};

const STEPS = ["Pregunta y objetivo", "Población y territorio", "Métodos", "Diseño muestral", "Revisión"];
const STEP_FIELDS: string[][] = [
  ["title", "research_question", "objective_type"],
  ["target_population", "geo_area_codes", "starts_on", "ends_on"],
  ["methods"],
  ["sampling_design", "planned_sample_size", "target_moe", "confidence_level"],
  [],
];

type Area = { code: string; name: string };

function toPayload(v: ProjectFormValues) {
  const probabilistic = v.sampling_design === "probabilistico";
  return {
    title: v.title,
    research_question: v.research_question,
    objective_type: v.objective_type,
    description: v.description,
    target_population: v.target_population,
    geo_area_codes: v.geo_area_codes,
    methods: v.methods,
    sampling_design: v.sampling_design,
    planned_sample_size: v.planned_sample_size === "" ? null : Number(v.planned_sample_size),
    target_moe: probabilistic && v.moe_points !== "" ? Number(v.moe_points) / 100 : null,
    confidence_level: probabilistic && v.moe_points !== "" ? Number(v.confidence_level) : null,
    starts_on: v.starts_on || null,
    ends_on: v.ends_on || null,
  };
}

export function ProjectForm({
  organizationId,
  areas,
  initial,
  projectId,
  version,
}: {
  organizationId: string;
  areas: Area[];
  initial?: ProjectFormValues;
  projectId?: string;
  version?: number;
}) {
  const router = useRouter();
  const editing = Boolean(projectId);
  const [values, setValues] = useState<ProjectFormValues>(initial ?? EMPTY);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const toggle = (key: "methods" | "geo_area_codes", item: string) =>
    setValues((v) => ({ ...v, [key]: v[key].includes(item) ? v[key].filter((x) => x !== item) : [...v[key], item] }));

  const payload = toPayload(values);
  const validation = validateProject(payload);
  const errors = validation.ok ? {} : validation.errors;

  const suggestion = useMemo(() => {
    const moe = Number(values.moe_points) / 100;
    if (values.sampling_design !== "probabilistico" || !(moe > 0 && moe <= 0.5)) return null;
    try {
      return sampleSizeForProportion({ marginOfError: moe, confidence: Number(values.confidence_level) || 0.95 });
    } catch {
      return null;
    }
  }, [values.sampling_design, values.moe_points, values.confidence_level]);

  const warnings = assessInference({
    design: values.sampling_design as Parameters<typeof assessInference>[0]["design"],
    methods: values.methods,
    plannedSampleSize: payload.planned_sample_size,
  });

  function stepErrors(index: number) {
    return STEP_FIELDS[index].filter((f) => errors[f]);
  }

  function next() {
    const bad = stepErrors(step);
    setFieldErrors(errors);
    if (bad.length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < STEPS.length - 1) return next();
    setFieldErrors(errors);
    if (!validation.ok) {
      const first = STEP_FIELDS.findIndex((fields) => fields.some((f) => errors[f]));
      if (first >= 0) setStep(first);
      return;
    }
    setBusy(true);
    setError("");
    const result = editing
      ? await send<{ id: string }>("PATCH", `/api/v1/projects/${projectId}`, { ...payload, version })
      : await send<{ id: string }>("POST", "/api/v1/projects", { ...payload, organizationId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      if (result.fields) setFieldErrors(result.fields);
      return;
    }
    router.push(`/proyectos/${result.data.id}`);
    router.refresh();
  }

  const err = (key: string) => (fieldErrors[key] ? <span className="error">{fieldErrors[key]}</span> : null);

  return (
    <form className="card form" onSubmit={submit}>
      <ol className="steps" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined}>
            <button type="button" className="btn link" style={{ color: "inherit" }} onClick={() => setStep(i)}>
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <>
          <div className="field">
            <label htmlFor="p-title">Título del proyecto</label>
            <input id="p-title" type="text" value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
            {err("title")}
          </div>
          <div className="field">
            <label htmlFor="p-question">Pregunta de investigación</label>
            <textarea id="p-question" value={values.research_question} onChange={(e) => set("research_question", e.target.value)} maxLength={2000} />
            <span className="hint">Formule qué quiere saber, de quién y en qué periodo. Ej.: «¿Cómo valoran los residentes de 18 años o más la calidad del servicio eléctrico en 2026?»</span>
            {err("research_question")}
          </div>
          <fieldset className="field">
            <legend>Tipo de objetivo</legend>
            <div className="checks">
              {Object.entries(OBJECTIVE_TYPES).map(([code, label]) => (
                <label key={code}>
                  <input type="radio" name="objective" checked={values.objective_type === code} onChange={() => set("objective_type", code)} />
                  {label}
                </label>
              ))}
            </div>
            {err("objective_type")}
          </fieldset>
          <div className="field">
            <label htmlFor="p-desc">Contexto y alcance (opcional)</label>
            <textarea id="p-desc" value={values.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <div className="field">
            <label htmlFor="p-pop">Población o universo de estudio</label>
            <input id="p-pop" type="text" value={values.target_population} onChange={(e) => set("target_population", e.target.value)} maxLength={1000} />
            <span className="hint">Ej.: «Residentes de 18 años o más en hogares particulares». Si estudia documentos o conversaciones, describa ese universo.</span>
          </div>
          <fieldset className="field">
            <legend>Cobertura territorial (República Dominicana)</legend>
            <div className="form-actions small">
              <button type="button" className="btn small" onClick={() => set("geo_area_codes", ["DO"])}>Todo el país</button>
              <button type="button" className="btn small" onClick={() => set("geo_area_codes", [])}>Limpiar</button>
            </div>
            <div className="checks">
              {areas.map((a) => (
                <label key={a.code}>
                  <input type="checkbox" checked={values.geo_area_codes.includes(a.code)} onChange={() => toggle("geo_area_codes", a.code)} />
                  {a.name}
                </label>
              ))}
            </div>
            {err("geo_area_codes")}
          </fieldset>
          <div className="form-row">
            <div className="field">
              <label htmlFor="p-start">Inicio previsto</label>
              <input id="p-start" type="date" value={values.starts_on} onChange={(e) => set("starts_on", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-end">Fin previsto</label>
              <input id="p-end" type="date" value={values.ends_on} onChange={(e) => set("ends_on", e.target.value)} />
              {err("ends_on")}
            </div>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <fieldset className="field">
          <legend>Métodos de recolección y fuentes</legend>
          <span className="hint">Seleccionar un método no lo activa: los canales y conectores se habilitan en sus fases, con permisos verificados.</span>
          <div className="checks">
            {Object.entries(METHODS).map(([code, label]) => (
              <label key={code}>
                <input type="checkbox" checked={values.methods.includes(code)} onChange={() => toggle("methods", code)} />
                {label}
              </label>
            ))}
          </div>
          {err("methods")}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <>
          <fieldset className="field">
            <legend>Diseño muestral</legend>
            <div className="checks" style={{ gridTemplateColumns: "1fr" }}>
              {Object.entries(SAMPLING_DESIGNS).map(([code, label]) => (
                <label key={code}>
                  <input type="radio" name="design" checked={values.sampling_design === code}
                    onChange={() => setValues((v) => ({ ...v, sampling_design: code, moe_points: code === "probabilistico" ? v.moe_points : "" }))} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-row">
            {values.sampling_design === "probabilistico" ? (
              <>
                <div className="field">
                  <label htmlFor="p-moe">Margen de error objetivo (puntos)</label>
                  <input id="p-moe" type="number" min="0.1" max="50" step="0.1" value={values.moe_points} onChange={(e) => set("moe_points", e.target.value)} />
                  {err("target_moe")}
                </div>
                <div className="field">
                  <label htmlFor="p-conf">Nivel de confianza</label>
                  <select id="p-conf" value={values.confidence_level} onChange={(e) => set("confidence_level", e.target.value)}>
                    {CONFIDENCE_LEVELS.map((c) => <option key={c} value={String(c)}>{Math.round(c * 100)} %</option>)}
                  </select>
                  {err("confidence_level")}
                </div>
              </>
            ) : null}
            <div className="field">
              <label htmlFor="p-n">Tamaño de muestra previsto</label>
              <input id="p-n" type="number" min="1" step="1" value={values.planned_sample_size} onChange={(e) => set("planned_sample_size", e.target.value)} />
              {err("planned_sample_size")}
            </div>
          </div>
          {suggestion ? (
            <div className="alert info">
              <strong>Referencia de muestreo aleatorio simple</strong>
              Para ±{values.moe_points} puntos al {Math.round(Number(values.confidence_level) * 100)} % (p = 0,5, población grande) se requieren al menos{" "}
              <strong style={{ display: "inline" }}>{suggestion.n.toLocaleString("es-DO")}</strong> entrevistas completas, antes del efecto de diseño.{" "}
              <button type="button" className="btn link" onClick={() => set("planned_sample_size", String(suggestion.n))}>Usar este valor</button>
            </div>
          ) : null}
          <Warnings items={warnings} />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <dl className="dl">
            <dt>Título</dt><dd>{values.title || "—"}</dd>
            <dt>Pregunta</dt><dd>{values.research_question || "—"}</dd>
            <dt>Objetivo</dt><dd>{OBJECTIVE_TYPES[values.objective_type as keyof typeof OBJECTIVE_TYPES] ?? "—"}</dd>
            <dt>Población</dt><dd>{values.target_population || "—"}</dd>
            <dt>Territorio</dt><dd>{values.geo_area_codes.length ? values.geo_area_codes.map((c) => areas.find((a) => a.code === c)?.name ?? (c === "DO" ? "Todo el país" : c)).join(", ") : "—"}</dd>
            <dt>Métodos</dt><dd>{values.methods.length ? values.methods.map((m) => METHODS[m as keyof typeof METHODS]).join(" · ") : "—"}</dd>
            <dt>Diseño muestral</dt><dd>{SAMPLING_DESIGNS[values.sampling_design as keyof typeof SAMPLING_DESIGNS]}</dd>
            <dt>Muestra prevista</dt><dd>{values.planned_sample_size || "—"}</dd>
            <dt>Margen de error</dt>
            <dd>{values.sampling_design === "probabilistico" && values.moe_points ? `±${values.moe_points} puntos al ${Math.round(Number(values.confidence_level) * 100)} %` : "No aplica"}</dd>
          </dl>
          <Warnings items={warnings} />
          {!validation.ok ? <div className="alert error">Hay datos pendientes: {Object.values(errors).join(" ")}</div> : null}
        </>
      ) : null}

      <div className="form-actions">
        {step > 0 ? <button type="button" className="btn" onClick={() => setStep(step - 1)}>Anterior</button> : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn primary" onClick={next}>Siguiente</button>
        ) : (
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear proyecto"}</button>
        )}
      </div>
      {error ? <div className="alert error" role="alert">{error}</div> : null}
    </form>
  );
}
