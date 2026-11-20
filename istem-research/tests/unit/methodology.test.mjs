import test from "node:test";
import assert from "node:assert/strict";
import {
  normalQuantile, zForConfidence, sampleSizeForProportion, marginOfError, kishEffectiveSampleSize,
  weightingDesignEffect, rake, allocateProportional, fieldworkDays, suppressSmallCells, assessInference,
} from "../../lib/methodology.ts";

const close = (a, b, tol = 1e-6, msg) => assert.ok(Math.abs(a - b) <= tol, msg ?? `${a} ≈ ${b}`);

test("cuantiles normales conocidos", () => {
  close(normalQuantile(0.975), 1.959963985, 1e-8);
  close(normalQuantile(0.5), 0, 1e-12);
  close(normalQuantile(0.995), 2.575829304, 1e-8);
  close(normalQuantile(0.01), -2.326347874, 1e-8);
  close(zForConfidence(0.9), 1.644853627, 1e-8);
  assert.throws(() => normalQuantile(1), RangeError);
});

test("tamaño de muestra clásico: ±3 puntos al 95 % → 1068", () => {
  const r = sampleSizeForProportion({ marginOfError: 0.03 });
  close(r.nSrs, 1067.07, 0.01);
  assert.equal(r.n, 1068);
  assert.equal(sampleSizeForProportion({ marginOfError: 0.05 }).n, 385);
});

test("corrección por población finita, efecto de diseño y contactos", () => {
  // n0 = 1067.07; n = n0 / (1 + (n0-1)/10000) = 964.29 → 965
  assert.equal(sampleSizeForProportion({ marginOfError: 0.03, populationSize: 10000 }).n, 965);
  assert.equal(sampleSizeForProportion({ marginOfError: 0.03, designEffect: 1.5 }).n, 1601);
  assert.equal(sampleSizeForProportion({ marginOfError: 0.03, populationSize: 50 }).n <= 50, true);
  assert.equal(sampleSizeForProportion({ marginOfError: 0.05, responseRate: 0.25 }).contactsNeeded, 1540);
  assert.throws(() => sampleSizeForProportion({ marginOfError: 0 }), RangeError);
  assert.throws(() => sampleSizeForProportion({ marginOfError: 0.03, designEffect: 0.5 }), RangeError);
});

test("margen de error solo para diseños probabilísticos", () => {
  const m = marginOfError({ n: 1068, design: "probabilistico" });
  assert.equal(m.applicable, true);
  close(m.marginOfError, 0.02999, 1e-4);
  const withDeff = marginOfError({ n: 1000, design: "probabilistico", designEffect: 2 });
  close(withDeff.marginOfError, 1.959964 * Math.sqrt(2 * 0.25 / 1000), 1e-5);
  assert.equal(withDeff.effectiveN, 500);
  for (const design of ["no_probabilistico", "mixto", "no_aplica", "por_definir"]) {
    const r = marginOfError({ n: 5000, design });
    assert.equal(r.applicable, false, design);
    assert.equal("marginOfError" in r, false, `${design} no expone número`);
    assert.ok(r.reason.length > 20);
  }
});

test("corrección por población finita en el margen", () => {
  const full = marginOfError({ n: 100, design: "probabilistico", populationSize: 100 });
  close(full.marginOfError, 0, 1e-12, "censo completo: sin error muestral");
  assert.throws(() => marginOfError({ n: 200, design: "probabilistico", populationSize: 100 }), RangeError);
});

test("n efectivo de Kish y efecto de diseño por ponderación", () => {
  assert.equal(kishEffectiveSampleSize([1, 1, 1, 1]), 4);
  close(kishEffectiveSampleSize([1, 3]), 16 / 10);
  close(weightingDesignEffect([1, 3]), 2 / 1.6);
  close(weightingDesignEffect([2, 2, 2]), 1);
  assert.throws(() => kishEffectiveSampleSize([1, -1]), RangeError);
});

test("raking converge a los márgenes objetivo", () => {
  const units = [
    ...Array.from({ length: 60 }, (_, i) => ({ sexo: "M", zona: i < 45 ? "urbana" : "rural" })),
    ...Array.from({ length: 40 }, (_, i) => ({ sexo: "F", zona: i < 20 ? "urbana" : "rural" })),
  ];
  const targets = { sexo: { M: 0.49, F: 0.51 }, zona: { urbana: 0.74, rural: 0.26 } };
  const r = rake(units, targets);
  assert.equal(r.converged, true);
  assert.ok(r.maxDeviation < 1e-6);
  const total = r.weights.reduce((a, b) => a + b, 0);
  close(total / units.length, 1, 1e-9, "pesos con media 1");
  const share = (key, value) => units.reduce((s, u, i) => s + (u[key] === value ? r.weights[i] : 0), 0) / total;
  close(share("sexo", "F"), 0.51, 1e-6);
  close(share("zona", "rural"), 0.26, 1e-6);
  assert.ok(r.designEffect >= 1);
  assert.ok(r.effectiveSampleSize < units.length);
});

test("raking rechaza calibraciones imposibles", () => {
  assert.throws(() => rake([{ s: "M" }], { s: { M: 0.5, F: 0.5 } }), /No hay casos/);
  assert.throws(() => rake([{ s: "M" }, { s: "X" }], { s: { M: 1 } }), /no tiene objetivo/);
  assert.throws(() => rake([{ s: "M" }], { s: { M: 0.7 } }), /sumar 1/);
});

test("asignación proporcional exacta, con mínimo y sin pérdidas", () => {
  assert.deepEqual(allocateProportional(100, { a: 70, b: 30 }), { a: 70, b: 30 });
  const r = allocateProportional(1000, { a: 1, b: 1, c: 1 });
  assert.equal(r.a + r.b + r.c, 1000);
  const m = allocateProportional(100, { grande: 990, chico: 10 }, 20);
  assert.equal(m.chico >= 20, true);
  assert.equal(m.grande + m.chico, 100);
  assert.throws(() => allocateProportional(10, { a: 1, b: 1 }, 6), RangeError);
});

test("días de campo y supresión de celdas pequeñas", () => {
  assert.equal(fieldworkDays(1068, 10, 8), 14);
  const cells = suppressSmallCells([{ label: "A", n: 120, value: 0.4 }, { label: "B", n: 12, value: 0.9 }], 30);
  assert.equal(cells[0].value, 0.4);
  assert.equal(cells[1].value, null);
  assert.equal(cells[1].suppressed, true);
});

test("advertencias de inferencia", () => {
  const codes = (input) => assessInference(input).map((w) => w.code);
  assert.ok(codes({ design: "no_probabilistico" }).includes("non_probability"));
  assert.ok(codes({ design: "no_aplica", methods: ["escucha_social"] }).includes("digital_not_population"));
  assert.ok(codes({ design: "por_definir" }).includes("design_undefined"));
  assert.ok(codes({ design: "probabilistico", plannedSampleSize: 50 }).includes("small_sample"));
  assert.ok(codes({ design: "probabilistico", plannedSampleSize: 300, strata: 32 }).includes("thin_strata"));
  assert.deepEqual(codes({ design: "probabilistico", plannedSampleSize: 1200 }), []);
});
