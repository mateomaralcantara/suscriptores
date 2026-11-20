// Reglas puras de proyectos. Deben coincidir con database/migrations/001_fundamentos.sql
// (lo comprueba tests/unit/project-rules.test.mjs). Sin imports de runtime.

export const PROJECT_STATUSES = ["borrador", "diseno", "campo", "analisis", "revision", "en_pausa", "terminado", "archivado"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  borrador: "Borrador",
  diseno: "Diseño",
  campo: "Trabajo de campo",
  analisis: "Análisis",
  revision: "Revisión",
  en_pausa: "En pausa",
  terminado: "Terminado",
  archivado: "Archivado",
};

export const STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  borrador: ["diseno", "archivado"],
  diseno: ["borrador", "campo", "en_pausa", "archivado"],
  campo: ["analisis", "en_pausa"],
  analisis: ["campo", "revision", "en_pausa"],
  revision: ["analisis", "terminado"],
  en_pausa: ["diseno", "campo", "analisis", "archivado"],
  terminado: ["archivado"],
  archivado: ["borrador"],
};

export const OBJECTIVE_TYPES = {
  exploratorio: "Exploratorio: identificar temas y preguntas",
  descriptivo: "Descriptivo: medir cómo es una población o fenómeno",
  explicativo: "Explicativo: relaciones entre variables (no implica causalidad sin diseño adecuado)",
  evaluativo: "Evaluativo: valorar un programa, servicio o intervención",
  seguimiento: "Seguimiento: medición recurrente en el tiempo",
  comparativo: "Comparativo: contrastar grupos, territorios o fuentes",
} as const;
export type ObjectiveType = keyof typeof OBJECTIVE_TYPES;

export const METHODS = {
  cawi: "CAWI · encuesta web",
  capi: "CAPI · presencial con dispositivo",
  cati: "CATI · telefónica asistida",
  ivr: "IVR · voz automatizada (con consentimiento)",
  sms: "SMS (participantes que aceptaron)",
  whatsapp: "WhatsApp (API oficial, con opt-in)",
  email: "Correo electrónico",
  app_movil: "Aplicación móvil",
  tablet: "Tablet en campo",
  qr: "Código QR",
  entrevista_ia: "Entrevista asistida por IA (identificada)",
  escucha_social: "Escucha social autorizada",
  investigacion_web: "Investigación web y documental",
  documental: "Revisión documental",
  poll_of_polls: "Encuesta de encuestas",
  datos_secundarios: "Datos secundarios / registros oficiales",
} as const;
export type Method = keyof typeof METHODS;

export const SAMPLING_DESIGNS = {
  probabilistico: "Probabilístico (aleatorio, estratificado, por conglomerados…)",
  no_probabilistico: "No probabilístico (panel voluntario, cuotas, conveniencia)",
  mixto: "Mixto",
  no_aplica: "No aplica (análisis documental o digital, sin muestra)",
  por_definir: "Por definir",
} as const;
export type SamplingDesignCode = keyof typeof SAMPLING_DESIGNS;

export const CONFIDENCE_LEVELS = [0.8, 0.9, 0.95, 0.99] as const;

export function canTransition(from: ProjectStatus, to: ProjectStatus) {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export type ProjectInput = {
  title?: unknown;
  research_question?: unknown;
  objective_type?: unknown;
  description?: unknown;
  target_population?: unknown;
  geo_area_codes?: unknown;
  methods?: unknown;
  sampling_design?: unknown;
  planned_sample_size?: unknown;
  target_moe?: unknown;
  confidence_level?: unknown;
  starts_on?: unknown;
  ends_on?: unknown;
};

export type CleanProject = {
  title: string;
  research_question: string;
  objective_type: ObjectiveType;
  description: string;
  target_population: string;
  geo_area_codes: string[];
  methods: Method[];
  sampling_design: SamplingDesignCode;
  planned_sample_size: number | null;
  target_moe: number | null;
  confidence_level: number | null;
  starts_on: string | null;
  ends_on: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Valida y normaliza un proyecto. Devuelve errores en español por campo. */
export function validateProject(input: ProjectInput): { ok: true; value: CleanProject } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const title = String(input.title ?? "").trim();
  const question = String(input.research_question ?? "").trim();
  const objective = String(input.objective_type ?? "");
  const design = String(input.sampling_design ?? "por_definir") || "por_definir";
  const methods = Array.isArray(input.methods) ? input.methods.map(String) : [];
  const geo = Array.isArray(input.geo_area_codes) ? input.geo_area_codes.map(String) : [];
  const n = optionalNumber(input.planned_sample_size);
  const moe = optionalNumber(input.target_moe);
  const confidence = optionalNumber(input.confidence_level);
  const startsOn = input.starts_on ? String(input.starts_on) : null;
  const endsOn = input.ends_on ? String(input.ends_on) : null;

  if (title.length < 3 || title.length > 200) errors.title = "El título debe tener entre 3 y 200 caracteres.";
  if (question.length < 10 || question.length > 2000) errors.research_question = "Formule la pregunta de investigación (10 a 2000 caracteres).";
  if (!(objective in OBJECTIVE_TYPES)) errors.objective_type = "Seleccione el tipo de objetivo.";
  if (!(design in SAMPLING_DESIGNS)) errors.sampling_design = "Diseño muestral no válido.";
  if (methods.some((m) => !(m in METHODS))) errors.methods = "Método de recolección no válido.";
  if (geo.some((g) => !/^[A-Z]{2}(-[0-9A-Z]{1,6})*$/.test(g))) errors.geo_area_codes = "Área geográfica no válida.";
  if (n !== null && !(Number.isInteger(n) && n >= 1 && n <= 10_000_000)) errors.planned_sample_size = "El tamaño de muestra debe ser un entero entre 1 y 10.000.000.";
  if (moe !== null) {
    if (design !== "probabilistico") errors.target_moe = "Solo un diseño probabilístico admite margen de error.";
    else if (!(moe > 0 && moe <= 0.5)) errors.target_moe = "El margen de error es una proporción entre 0 y 0.5 (0.03 = ±3 puntos).";
  }
  if (confidence !== null && !CONFIDENCE_LEVELS.some((c) => Math.abs(c - confidence) < 1e-9)) {
    errors.confidence_level = "Nivel de confianza no válido.";
  }
  if (moe !== null && confidence === null && design === "probabilistico") errors.confidence_level = "Indique el nivel de confianza.";
  if (startsOn && !DATE.test(startsOn)) errors.starts_on = "Fecha no válida.";
  if (endsOn && !DATE.test(endsOn)) errors.ends_on = "Fecha no válida.";
  if (startsOn && endsOn && endsOn < startsOn) errors.ends_on = "La fecha final no puede ser anterior a la inicial.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      research_question: question,
      objective_type: objective as ObjectiveType,
      description: String(input.description ?? "").trim().slice(0, 5000),
      target_population: String(input.target_population ?? "").trim().slice(0, 1000),
      geo_area_codes: [...new Set(geo)],
      methods: [...new Set(methods)] as Method[],
      sampling_design: design as SamplingDesignCode,
      planned_sample_size: n,
      // Proporción (0.03 = ±3 puntos), igual que en la base de datos.
      target_moe: moe,
      confidence_level: confidence,
      starts_on: startsOn,
      ends_on: endsOn,
    },
  };
}
