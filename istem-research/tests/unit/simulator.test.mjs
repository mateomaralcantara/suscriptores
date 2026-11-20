import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../lib/simulator.ts";

test("diseño probabilístico: n, contactos, margen, estratos y días", () => {
  const r = simulate({
    design: "probabilistico", marginOfError: 0.03, confidence: 0.95, designEffect: 1.5, responseRate: 0.4,
    strata: { Urbano: 7000, Rural: 3000 }, interviewers: 10, completesPerInterviewerDay: 8,
  });
  assert.equal(r.sampleSize, 1601);
  assert.equal(r.contactsNeeded, 4003);
  assert.equal(r.achievedMargin.applicable, true);
  assert.ok(Math.abs(r.achievedMargin.value - 0.03) < 1e-3);
  assert.deepEqual(r.allocation, { Urbano: 1121, Rural: 480 });
  assert.equal(r.fieldworkDays, 21);
});

test("diseño no probabilístico: nunca devuelve margen y bloquea si se pide", () => {
  const r = simulate({ design: "no_probabilistico", marginOfError: 0.03, plannedSampleSize: 2000 });
  assert.equal(r.sampleSize, 2000);
  assert.equal(r.achievedMargin.applicable, false);
  assert.ok(r.warnings.some((w) => w.code === "moe_not_applicable" && w.level === "bloqueo"));
  assert.ok(r.warnings.some((w) => w.code === "non_probability"));
});

test("asignación imposible se informa como bloqueo, no como excepción", () => {
  const r = simulate({ design: "probabilistico", plannedSampleSize: 10, strata: { a: 1, b: 1 }, minimumPerStratum: 6 });
  assert.equal(r.allocation, null);
  assert.ok(r.warnings.some((w) => w.code === "allocation"));
});
