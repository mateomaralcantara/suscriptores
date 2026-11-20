import { fail, json, readJsonObject, requireApiSession } from "@/lib/api";
import { simulate, type SimulationInput } from "@/lib/simulator";

const DESIGNS = ["probabilistico", "no_probabilistico", "mixto", "no_aplica", "por_definir"];

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Simulador muestral (cálculo puro, sin acceso a datos). */
export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  const design = String(body.design ?? "");
  if (!DESIGNS.includes(design)) return fail(400, "Diseño muestral no válido.");
  const strata = body.strata && typeof body.strata === "object" && !Array.isArray(body.strata)
    ? Object.fromEntries(Object.entries(body.strata as Record<string, unknown>).slice(0, 200).map(([k, v]) => [k.slice(0, 80), Number(v)]))
    : null;
  const input: SimulationInput = {
    design: design as SimulationInput["design"],
    methods: Array.isArray(body.methods) ? body.methods.map(String).slice(0, 20) : [],
    marginOfError: num(body.marginOfError),
    confidence: num(body.confidence) ?? 0.95,
    p: num(body.p) ?? 0.5,
    populationSize: num(body.populationSize),
    designEffect: num(body.designEffect) ?? 1,
    responseRate: num(body.responseRate),
    plannedSampleSize: num(body.plannedSampleSize),
    strata,
    minimumPerStratum: num(body.minimumPerStratum) ?? 0,
    interviewers: num(body.interviewers),
    completesPerInterviewerDay: num(body.completesPerInterviewerDay),
  };
  try {
    return json({ ok: true, data: simulate(input) });
  } catch (error) {
    if (error instanceof RangeError) return fail(400, error.message);
    console.error("[v1/methodology/simulate]", error);
    return fail(500, "Error interno. Inténtalo de nuevo.");
  }
}
