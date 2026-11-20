// ISTEM STATISTICS · núcleo metodológico puro (sin dependencias ni imports de runtime).
// Las pruebas lo importan directamente con `node --test` (type stripping de Node >= 22.18).
//
// Principio rector: un margen de error probabilístico solo se calcula para diseños
// probabilísticos. Para muestras voluntarias o conversaciones digitales se devuelve
// `applicable: false` con la razón, nunca un número.

export type SamplingDesign = "probabilistico" | "no_probabilistico" | "mixto" | "no_aplica" | "por_definir";

export type Warning = { level: "bloqueo" | "advertencia" | "info"; code: string; message: string };

/** Inversa de la normal estándar (algoritmo de Acklam, error relativo < 1.2e-9). */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new RangeError("p debe estar entre 0 y 1");
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Valor z bilateral para un nivel de confianza (0.95 → 1.95996…). */
export function zForConfidence(confidence: number): number {
  if (!(confidence > 0.5 && confidence < 1)) throw new RangeError("La confianza debe estar entre 0.5 y 1");
  return normalQuantile(1 - (1 - confidence) / 2);
}

export type SampleSizeInput = {
  /** Margen de error deseado como proporción (0.03 = ±3 puntos). */
  marginOfError: number;
  confidence?: number;
  /** Proporción esperada; 0.5 es el caso más conservador. */
  p?: number;
  /** Tamaño de la población (activa la corrección por población finita). */
  populationSize?: number;
  /** Efecto de diseño esperado (conglomerados, ponderación). */
  designEffect?: number;
  /** Tasa de respuesta esperada (0-1) para estimar contactos necesarios. */
  responseRate?: number;
};

export type SampleSizeResult = {
  z: number;
  /** n para muestreo aleatorio simple en población infinita. */
  nSrs: number;
  /** n tras aplicar el efecto de diseño. */
  nWithDesignEffect: number;
  /** n final (entero, con corrección por población finita si aplica). */
  n: number;
  /** Contactos estimados según la tasa de respuesta. */
  contactsNeeded: number | null;
};

/** Tamaño de muestra para estimar una proporción en un diseño probabilístico. */
export function sampleSizeForProportion(input: SampleSizeInput): SampleSizeResult {
  const { marginOfError: e, confidence = 0.95, p = 0.5, populationSize, designEffect = 1, responseRate } = input;
  if (!(e > 0 && e <= 0.5)) throw new RangeError("El margen de error debe estar entre 0 y 0.5");
  if (!(p > 0 && p < 1)) throw new RangeError("La proporción esperada debe estar entre 0 y 1");
  if (!(designEffect >= 1)) throw new RangeError("El efecto de diseño debe ser >= 1");
  if (populationSize !== undefined && !(Number.isInteger(populationSize) && populationSize >= 1)) {
    throw new RangeError("La población debe ser un entero positivo");
  }
  if (responseRate !== undefined && !(responseRate > 0 && responseRate <= 1)) {
    throw new RangeError("La tasa de respuesta debe estar entre 0 y 1");
  }
  const z = zForConfidence(confidence);
  const nSrs = (z * z * p * (1 - p)) / (e * e);
  const nWithDesignEffect = nSrs * designEffect;
  const adjusted = populationSize ? nWithDesignEffect / (1 + (nWithDesignEffect - 1) / populationSize) : nWithDesignEffect;
  const n = Math.min(Math.ceil(adjusted - 1e-9), populationSize ?? Number.POSITIVE_INFINITY);
  return {
    z,
    nSrs,
    nWithDesignEffect,
    n,
    contactsNeeded: responseRate ? Math.ceil(n / responseRate) : null,
  };
}

export type MarginInput = {
  n: number;
  design: SamplingDesign;
  confidence?: number;
  p?: number;
  populationSize?: number;
  designEffect?: number;
};

export type MarginResult =
  | { applicable: true; marginOfError: number; z: number; effectiveN: number }
  | { applicable: false; reason: string };

/** Margen de error de una proporción. Solo aplicable a diseños probabilísticos. */
export function marginOfError(input: MarginInput): MarginResult {
  const { n, design, confidence = 0.95, p = 0.5, populationSize, designEffect = 1 } = input;
  if (design !== "probabilistico") {
    return {
      applicable: false,
      reason:
        design === "no_probabilistico" || design === "mixto"
          ? "La muestra no es (totalmente) probabilística: no corresponde un margen de error convencional. Informe la estimación como no probabilística, con su método de ajuste y una medida de incertidumbre basada en modelos, documentada como tal."
          : "Sin diseño muestral probabilístico definido no se puede calcular un margen de error.",
    };
  }
  if (!(Number.isInteger(n) && n >= 2)) throw new RangeError("n debe ser un entero >= 2");
  if (!(p >= 0 && p <= 1)) throw new RangeError("p debe estar entre 0 y 1");
  if (!(designEffect >= 1)) throw new RangeError("El efecto de diseño debe ser >= 1");
  if (populationSize !== undefined && populationSize < n) throw new RangeError("La población no puede ser menor que la muestra");
  const z = zForConfidence(confidence);
  const fpc = populationSize && populationSize > 1 ? (populationSize - n) / (populationSize - 1) : 1;
  const variance = (designEffect * p * (1 - p) * fpc) / n;
  return { applicable: true, marginOfError: z * Math.sqrt(variance), z, effectiveN: n / designEffect };
}

/** Tamaño muestral efectivo de Kish: (Σw)² / Σw². */
export function kishEffectiveSampleSize(weights: readonly number[]): number {
  if (weights.length === 0) return 0;
  let sum = 0;
  let sumSq = 0;
  for (const w of weights) {
    if (!(w >= 0) || !Number.isFinite(w)) throw new RangeError("Los pesos deben ser finitos y no negativos");
    sum += w;
    sumSq += w * w;
  }
  return sumSq === 0 ? 0 : (sum * sum) / sumSq;
}

/** Efecto de diseño por ponderación (Kish): n / n_efectivo = 1 + CV². */
export function weightingDesignEffect(weights: readonly number[]): number {
  const neff = kishEffectiveSampleSize(weights);
  return neff === 0 ? Number.NaN : weights.length / neff;
}

export type RakeTargets = Record<string, Record<string, number>>;
export type RakeResult = {
  weights: number[];
  iterations: number;
  converged: boolean;
  /** Máxima diferencia absoluta entre proporción ponderada y objetivo. */
  maxDeviation: number;
  effectiveSampleSize: number;
  designEffect: number;
};

/**
 * Raking / ajuste proporcional iterativo (IPF) a márgenes poblacionales.
 * `units[i][variable]` es la categoría de la unidad i; `targets[variable][categoria]` son
 * proporciones que suman 1 por variable. Los pesos resultantes tienen media 1.
 */
export function rake(
  units: ReadonlyArray<Record<string, string>>,
  targets: RakeTargets,
  options: { maxIterations?: number; tolerance?: number; baseWeights?: readonly number[] } = {},
): RakeResult {
  const { maxIterations = 100, tolerance = 1e-6, baseWeights } = options;
  const n = units.length;
  if (n === 0) throw new RangeError("No hay unidades para ponderar");
  const variables = Object.keys(targets);
  if (variables.length === 0) throw new RangeError("Defina al menos una variable de calibración");
  for (const variable of variables) {
    const total = Object.values(targets[variable]).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 1e-6) throw new RangeError(`Los objetivos de "${variable}" deben sumar 1`);
    for (const [category, share] of Object.entries(targets[variable])) {
      if (share > 0 && !units.some((u) => u[variable] === category)) {
        throw new RangeError(`No hay casos en la categoría "${category}" de "${variable}": no se puede calibrar`);
      }
    }
    for (const unit of units) {
      if (!(unit[variable] in targets[variable])) {
        throw new RangeError(`La categoría "${unit[variable]}" de "${variable}" no tiene objetivo`);
      }
    }
  }
  const weights = baseWeights ? [...baseWeights] : new Array<number>(n).fill(1);
  if (weights.length !== n) throw new RangeError("baseWeights debe tener un peso por unidad");

  const deviation = () => {
    let max = 0;
    const total = weights.reduce((a, b) => a + b, 0);
    for (const variable of variables) {
      const sums: Record<string, number> = {};
      units.forEach((u, i) => (sums[u[variable]] = (sums[u[variable]] ?? 0) + weights[i]));
      for (const [category, share] of Object.entries(targets[variable])) {
        max = Math.max(max, Math.abs((sums[category] ?? 0) / total - share));
      }
    }
    return max;
  };

  let iterations = 0;
  let maxDeviation = deviation();
  while (maxDeviation > tolerance && iterations < maxIterations) {
    iterations += 1;
    for (const variable of variables) {
      const total = weights.reduce((a, b) => a + b, 0);
      const sums: Record<string, number> = {};
      units.forEach((u, i) => (sums[u[variable]] = (sums[u[variable]] ?? 0) + weights[i]));
      units.forEach((u, i) => {
        const current = sums[u[variable]] / total;
        weights[i] *= current > 0 ? targets[variable][u[variable]] / current : 0;
      });
    }
    maxDeviation = deviation();
  }
  const mean = weights.reduce((a, b) => a + b, 0) / n;
  const normalized = weights.map((w) => w / mean);
  return {
    weights: normalized,
    iterations,
    converged: maxDeviation <= tolerance,
    maxDeviation,
    effectiveSampleSize: kishEffectiveSampleSize(normalized),
    designEffect: weightingDesignEffect(normalized),
  };
}

/** Asignación proporcional por estratos con mínimo por estrato (método del mayor residuo). */
export function allocateProportional(total: number, strata: Record<string, number>, minimumPerStratum = 0): Record<string, number> {
  const entries = Object.entries(strata);
  if (!Number.isInteger(total) || total < 0) throw new RangeError("El total debe ser un entero no negativo");
  if (entries.some(([, size]) => !(size >= 0))) throw new RangeError("Los tamaños de estrato deben ser no negativos");
  const reserved = minimumPerStratum * entries.length;
  if (reserved > total) throw new RangeError("El mínimo por estrato supera el tamaño de la muestra");
  const population = entries.reduce((a, [, size]) => a + size, 0);
  if (population === 0) throw new RangeError("La población total es cero");
  const remaining = total - reserved;
  const raw = entries.map(([name, size]) => ({ name, exact: (remaining * size) / population }));
  const result: Record<string, number> = {};
  let assigned = 0;
  for (const item of raw) {
    result[item.name] = minimumPerStratum + Math.floor(item.exact);
    assigned += Math.floor(item.exact);
  }
  raw
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || a.name.localeCompare(b.name))
    .slice(0, remaining - assigned)
    .forEach((item) => (result[item.name] += 1));
  return result;
}

/** Días de campo necesarios para completar n entrevistas. */
export function fieldworkDays(completes: number, interviewers: number, completesPerInterviewerDay: number): number {
  if (!(completes >= 0 && interviewers > 0 && completesPerInterviewerDay > 0)) {
    throw new RangeError("Parámetros de campo no válidos");
  }
  return Math.ceil(completes / (interviewers * completesPerInterviewerDay));
}

export type Cell = { label: string; n: number; value: number | null };

/** Supresión estadística: oculta celdas con menos de `minimumN` casos para proteger identidades. */
export function suppressSmallCells(cells: readonly Cell[], minimumN = 30): Array<Cell & { suppressed: boolean }> {
  return cells.map((cell) => (cell.n < minimumN ? { ...cell, value: null, suppressed: true } : { ...cell, suppressed: false }));
}

export type InferenceInput = {
  design: SamplingDesign;
  methods?: readonly string[];
  plannedSampleSize?: number | null;
  designEffect?: number;
  strata?: number;
};

/** Evalúa si una inferencia poblacional está sustentada y devuelve advertencias explícitas. */
export function assessInference(input: InferenceInput): Warning[] {
  const warnings: Warning[] = [];
  const methods = input.methods ?? [];
  const n = input.plannedSampleSize ?? null;
  if (input.design === "por_definir") {
    warnings.push({ level: "bloqueo", code: "design_undefined", message: "Defina el diseño muestral antes de iniciar el trabajo de campo." });
  }
  if (input.design === "no_probabilistico" || input.design === "mixto") {
    warnings.push({
      level: "advertencia",
      code: "non_probability",
      message: "Muestra no probabilística: no se publicará margen de error convencional. Toda inferencia poblacional dependerá de supuestos de modelo que deben documentarse.",
    });
  }
  if (input.design === "no_aplica") {
    warnings.push({ level: "info", code: "no_inference", message: "Sin muestra: los resultados describen las fuentes analizadas, no a una población." });
  }
  if (methods.includes("escucha_social")) {
    warnings.push({
      level: "advertencia",
      code: "digital_not_population",
      message: "Las conversaciones digitales no son una muestra aleatoria: una persona puede comentar muchas veces y puede haber cuentas automatizadas. Se reportan como participación digital, no como opinión de la población.",
    });
  }
  if (methods.includes("entrevista_ia")) {
    warnings.push({ level: "info", code: "ai_interviewer", message: "Las entrevistas asistidas por IA deben identificarse como tales ante cada participante." });
  }
  if (methods.some((m) => m === "ivr" || m === "sms" || m === "whatsapp")) {
    warnings.push({ level: "info", code: "consent_channels", message: "IVR, SMS y WhatsApp requieren consentimiento previo y canales oficiales autorizados." });
  }
  if (n !== null && input.design === "probabilistico" && n < 100) {
    warnings.push({ level: "advertencia", code: "small_sample", message: "Muestra menor a 100 casos: la incertidumbre será amplia y los desgloses no serán publicables." });
  }
  if (n !== null && input.strata && input.strata > 0 && n / input.strata < 30) {
    warnings.push({ level: "advertencia", code: "thin_strata", message: "Menos de 30 casos por estrato en promedio: los resultados por estrato deberán suprimirse o modelarse." });
  }
  if ((input.designEffect ?? 1) > 2) {
    warnings.push({ level: "advertencia", code: "high_deff", message: "Efecto de diseño alto (> 2): el tamaño muestral efectivo será menos de la mitad del nominal." });
  }
  return warnings;
}
