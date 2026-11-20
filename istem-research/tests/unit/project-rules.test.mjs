import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { STATUS_TRANSITIONS, PROJECT_STATUSES, METHODS, OBJECTIVE_TYPES, canTransition, validateProject } from "../../lib/project-rules.ts";
import { MODULES } from "../../lib/modules.ts";

const sql = fs.readFileSync(new URL("../../database/migrations/001_fundamentos.sql", import.meta.url), "utf8");

test("las transiciones de estado coinciden con la base de datos", () => {
  const block = sql.slice(sql.indexOf("insert into public.project_status_transitions"), sql.indexOf("on conflict do nothing"));
  const pairs = [...block.matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)].map((m) => `${m[1]}>${m[2]}`).sort();
  const ts = Object.entries(STATUS_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => `${from}>${to}`)).sort();
  assert.deepEqual(ts, pairs);
});

test("estados, métodos y objetivos coinciden con las restricciones SQL", () => {
  for (const s of PROJECT_STATUSES) assert.ok(sql.includes(`'${s}'`), s);
  const methodsSql = sql.match(/v_methods text\[\] := array\[([^\]]+)\]/)[1].match(/'([a-z_]+)'/g).map((x) => x.slice(1, -1)).sort();
  assert.deepEqual(Object.keys(METHODS).sort(), methodsSql);
  for (const o of Object.keys(OBJECTIVE_TYPES)) assert.ok(sql.includes(`'${o}'`), o);
});

test("canTransition", () => {
  assert.equal(canTransition("borrador", "diseno"), true);
  assert.equal(canTransition("borrador", "terminado"), false);
  assert.equal(canTransition("terminado", "campo"), false);
});

const base = { title: "Estudio", research_question: "¿Pregunta suficientemente larga?", objective_type: "descriptivo" };

test("valida un proyecto mínimo y normaliza", () => {
  const r = validateProject({ ...base, methods: ["cati", "cati"], geo_area_codes: ["DO-01"] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.methods, ["cati"]);
  assert.equal(r.value.sampling_design, "por_definir");
});

test("margen de error solo con diseño probabilístico", () => {
  const bad = validateProject({ ...base, sampling_design: "no_probabilistico", target_moe: 0.03, confidence_level: 0.95 });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.target_moe);
  const good = validateProject({ ...base, sampling_design: "probabilistico", target_moe: 0.03, confidence_level: 0.95 });
  assert.equal(good.ok, true);
  assert.equal(good.value.target_moe, 0.03);
  assert.equal(validateProject({ ...base, sampling_design: "probabilistico", target_moe: 3, confidence_level: 0.95 }).ok, false);
  assert.ok(validateProject({ ...base, sampling_design: "probabilistico", target_moe: 0.03 }).errors.confidence_level);
});

test("rechaza datos no válidos", () => {
  const r = validateProject({ title: "x", research_question: "corta", objective_type: "otro", methods: ["scraping"], ends_on: "2026-01-01", starts_on: "2026-02-01", planned_sample_size: 1.5 });
  assert.equal(r.ok, false);
  for (const k of ["title", "research_question", "objective_type", "methods", "ends_on", "planned_sample_size"]) assert.ok(r.errors[k], k);
});

test("menú: 18 módulos, slugs únicos y estado honesto", () => {
  assert.equal(MODULES.length, 18);
  assert.equal(new Set(MODULES.map((m) => m.slug)).size, 18);
  for (const m of MODULES.filter((x) => x.status === "disponible")) assert.equal(m.phase, 1, m.slug);
  assert.equal(MODULES.find((m) => m.slug === "fuentes").status, "planificado");
});
