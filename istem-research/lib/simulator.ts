// Simulador de diseño muestral: combina las funciones de methodology.ts. Puro, sin imports de runtime
// salvo el propio núcleo (ruta relativa con extensión para que Node lo cargue en pruebas).
import {
  allocateProportional,
  assessInference,
  fieldworkDays,
  marginOfError,
  sampleSizeForProportion,
  type SamplingDesign,
  type Warning,
} from "./methodology.ts";

export type SimulationInput = {
  design: SamplingDesign;
  methods?: string[];
  /** Para diseños probabilísticos: margen deseado (proporción). */
  marginOfError?: number | null;
  confidence?: number;
  p?: number;
  populationSize?: number | null;
  designEffect?: number;
  responseRate?: number | null;
  /** Para diseños no probabilísticos o para fijar n directamente. */
  plannedSampleSize?: number | null;
  strata?: Record<string, number> | null;
  minimumPerStratum?: number;
  interviewers?: number | null;
  completesPerInterviewerDay?: number | null;
};

export type SimulationResult = {
  sampleSize: number | null;
  contactsNeeded: number | null;
  achievedMargin: { applicable: true; value: number; effectiveN: number } | { applicable: false; reason: string } | null;
  allocation: Record<string, number> | null;
  fieldworkDays: number | null;
  warnings: Warning[];
};

export function simulate(input: SimulationInput): SimulationResult {
  const warnings: Warning[] = [];
  const confidence = input.confidence ?? 0.95;
  const designEffect = input.designEffect ?? 1;
  const population = input.populationSize ?? undefined;
  let sampleSize: number | null = input.plannedSampleSize ?? null;
  let contactsNeeded: number | null = null;

  if (input.design === "probabilistico" && input.marginOfError) {
    const result = sampleSizeForProportion({
      marginOfError: input.marginOfError,
      confidence,
      p: input.p ?? 0.5,
      populationSize: population,
      designEffect,
      responseRate: input.responseRate ?? undefined,
    });
    sampleSize = result.n;
    contactsNeeded = result.contactsNeeded;
  } else if (input.design !== "probabilistico" && input.marginOfError) {
    warnings.push({
      level: "bloqueo",
      code: "moe_not_applicable",
      message: "Se pidió un margen de error para un diseño no probabilístico. No se calcula: no tendría interpretación probabilística.",
    });
  }
  if (sampleSize !== null && input.responseRate && contactsNeeded === null) {
    contactsNeeded = Math.ceil(sampleSize / input.responseRate);
  }

  let achievedMargin: SimulationResult["achievedMargin"] = null;
  if (sampleSize !== null && sampleSize >= 2) {
    const margin = marginOfError({ n: sampleSize, design: input.design, confidence, p: 0.5, populationSize: population, designEffect });
    achievedMargin = margin.applicable
      ? { applicable: true, value: margin.marginOfError, effectiveN: margin.effectiveN }
      : { applicable: false, reason: margin.reason };
  }

  let allocation: Record<string, number> | null = null;
  const strataCount = input.strata ? Object.keys(input.strata).length : 0;
  if (sampleSize !== null && input.strata && strataCount > 0) {
    try {
      allocation = allocateProportional(sampleSize, input.strata, input.minimumPerStratum ?? 0);
    } catch (error) {
      warnings.push({ level: "bloqueo", code: "allocation", message: error instanceof Error ? error.message : "Asignación no válida." });
    }
  }

  let days: number | null = null;
  if (sampleSize !== null && input.interviewers && input.completesPerInterviewerDay) {
    days = fieldworkDays(sampleSize, input.interviewers, input.completesPerInterviewerDay);
  }

  warnings.push(...assessInference({ design: input.design, methods: input.methods, plannedSampleSize: sampleSize, designEffect, strata: strataCount }));
  return { sampleSize, contactsNeeded, achievedMargin, allocation, fieldworkDays: days, warnings };
}
