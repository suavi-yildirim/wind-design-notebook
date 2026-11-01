// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRel } from './helpers.js';
import { uniformSteel, hybridTest } from './fixtures-inputs.js';
import { evaluate, inputsFromPreset } from '../src/calc/evaluate.js';
import { DEFAULT_LIMITS } from '../src/calc/defaults.js';

const CHECK_IDS_STEEL = ['freq', 'stress', 'transport.d', 'transport.l', 'transport.m', 'crane'];

/** @param {import('../src/calc/evaluate.js').Result} r */
function assertFiniteNumbers(r) {
  for (const c of r.checks) assert.ok(c.eta === null || Number.isFinite(c.eta), `${c.id} eta ${c.eta}`);
  assert.ok(!JSON.stringify(r.checks).includes('NaN'));
}

test('steel evaluate returns all checks in order, governing and verdict', () => {
  const r = evaluate(uniformSteel());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.checks.map((c) => c.id), CHECK_IDS_STEEL);
  const max = Math.max(...r.checks.map((c) => /** @type {number} */ (c.eta)));
  assert.equal(r.governing?.eta, max);
  assert.ok(['green', 'amber', 'red'].includes(r.verdict));
  assert.ok(r.f1 && r.f1.rayleigh_hz > 0 && r.f1.hand_hz > 0);
  assertFiniteNumbers(r);
});

test('hybrid adds concrete.m check and concrete mass', () => {
  const r = evaluate(hybridTest());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.checks.map((c) => c.id), ['freq', 'stress', 'transport.d', 'transport.l', 'transport.m', 'concrete.m', 'crane']);
  assert.ok(r.masses && r.masses.concrete_kg > 0);
  assert.ok(r.segments && r.segments.rings && r.segments.rings.count === 16);
});

test('stress check reports max η over steel stations only, with its height', () => {
  const r = evaluate(hybridTest());
  assert.ok(r.stress);
  assert.ok(r.stress.z_m >= 60, `z ${r.stress.z_m}`);
  const s = r.checks.find((c) => c.id === 'stress');
  assert.equal(s?.eta, r.stress.etaMax);
  assert.equal(s?.z_m, r.stress.z_m);
});

test('crane check = heaviest lift / capacity', () => {
  const r = evaluate(uniformSteel());
  const c = r.checks.find((x) => x.id === 'crane');
  assert.ok(r.crane && c);
  assertRel(/** @type {number} */ (c.eta), r.crane.mass_kg / 120000, 1e-12);
});

test('empty soft-stiff window: freq η null with explained error, other checks still govern', () => {
  const inp = uniformSteel();
  inp.turbine.rpmMin = 3.8;
  inp.turbine.rpmMax = 11.75;
  const r = evaluate(inp);
  assert.equal(r.checks.find((c) => c.id === 'freq')?.eta, null);
  assert.ok(r.errors.some((e) => e.id === 'freq' && e.key === 'error.freq.emptyWindow'));
  assert.ok(r.governing && r.governing.id !== 'freq');
  assert.ok(r.f1 && Number.isFinite(r.f1.rayleigh_hz));
  assertFiniteNumbers(r);
});

test('wall thickness above 80 mm: stress η null with a field error, no fallback', () => {
  const inp = uniformSteel();
  inp.steel.segments[0].tBot_m = 0.085;
  const r = evaluate(inp);
  assert.equal(r.checks.find((c) => c.id === 'stress')?.eta, null);
  assert.ok(r.errors.some((e) => e.key === 'error.stress.tOutsideTable' && e.field === 'steel.segments.0.tBot_m'), JSON.stringify(r.errors));
});

test('D/t hint: 333 → high, 67 → low, 200 → none', () => {
  /** @param {number} t */
  const hint = (t) => {
    const inp = uniformSteel();
    inp.steel.segments[0].tBot_m = t;
    inp.steel.segments[0].tTop_m = t;
    return evaluate(inp).dt?.hint;
  };
  assert.equal(hint(0.012), 'high');
  assert.equal(hint(0.060), 'low');
  assert.equal(hint(0.020), null);
});

test('invalid inputs never throw and report errors with field paths', () => {
  /** @type {[string, (i: import('../src/calc/types.js').Inputs) => void, string][]} */
  const cases = [
    ['t ≥ D/2', (i) => { i.steel.segments[0].tTop_m = 2.5; }, 'error.geom.tTooLarge'],
    ['D ≤ 0', (i) => { i.steel.segments[0].dBot_m = -1; }, 'error.geom.nonPositive'],
    ['H ≤ 0', (i) => { i.turbine.hubHeight_m = 0; }, 'error.geom.nonPositive'],
    ['n_min ≥ n_max', (i) => { i.turbine.rpmMin = 13; }, 'error.turbine.rpm'],
    ['rotor ≤ 0', (i) => { i.turbine.rotorDiameter_m = 0; }, 'error.input.nonPositive'],
    ['k_phi ≤ 0', (i) => { i.foundation.kPhi_Nm_per_rad = 0; }, 'error.foundation.kPhi'],
    ['L_max ≤ 0', (i) => { i.limits.lMax_m = 0; }, 'error.input.nonPositive'],
    ['NaN hub', (i) => { i.turbine.hubHeight_m = NaN; }, 'error.geom.nonPositive'],
  ];
  for (const [name, mutate, key] of cases) {
    const inp = uniformSteel();
    mutate(inp);
    const r = evaluate(inp);
    assert.ok(r.errors.some((e) => e.key === key && typeof e.field === 'string'), `${name}: ${JSON.stringify(r.errors)}`);
    assertFiniteNumbers(r);
  }
});

test('n_min ≥ n_max only blanks the frequency check', () => {
  const inp = uniformSteel();
  inp.turbine.rpmMin = 13;
  const r = evaluate(inp);
  assert.equal(r.checks.find((c) => c.id === 'freq')?.eta, null);
  assert.ok(r.checks.find((c) => c.id === 'stress')?.eta);
});

test('hybrid with hTr ≥ H returns an error instead of throwing', () => {
  const inp = hybridTest();
  inp.hybrid.concrete.hTr_m = 150;
  const r = evaluate(inp);
  assert.ok(r.errors.some((e) => e.key === 'error.geom.hTrRange'));
  assert.equal(r.governing, null);
  assert.equal(r.verdict, 'none');
});

test('inputsFromPreset merges default limits with preset overrides', () => {
  const preset = {
    schema: 1, id: 'p', limits: { craneCapacity_kg: 300000 },
    turbine: uniformSteel().turbine, foundation: { kPhi_Nm_per_rad: 1e11 },
    towers: { steel: uniformSteel().steel, hybrid: uniformSteel().hybrid }, sources: [],
  };
  const i = inputsFromPreset(preset, 'hybrid');
  assert.equal(i.type, 'hybrid');
  assert.equal(i.presetId, 'p');
  assert.equal(i.limits.craneCapacity_kg, 300000);
  assert.equal(i.limits.lMax_m, DEFAULT_LIMITS.lMax_m);
  assert.equal(i.assumptions.kAdd, 1.08);
  i.steel.segments[0].dBot_m = 99;
  assert.notEqual(preset.towers.steel.segments[0].dBot_m, 99, 'preset must not be mutated');
});

test('empty window: result is incomplete, verdict capped below green, resonance band reported', () => {
  const inp = uniformSteel();
  inp.turbine.rpmMin = 3.8;
  inp.turbine.rpmMax = 11.75;
  const r = evaluate(inp);
  assert.deepEqual(r.notAssessed, ['freq']);
  assert.notEqual(r.verdict, 'green');
  assert.ok(r.f1);
  // uniform tower f1 ≈ 0.23 Hz lies inside 3P = 0.19–0.5875 Hz
  assert.equal(r.f1.inBand, '3P');
  const ok = evaluate(uniformSteel());
  assert.deepEqual(ok.notAssessed, []);
  assert.equal(/** @type {any} */ (ok.f1).inBand, null);
});

test('ring height below 0.5 m is rejected instead of freezing the sweep', () => {
  const h = hybridTest();
  h.limits.ringHeight_m = 0.01;
  const r = evaluate(h);
  assert.ok(r.errors.some((e) => e.field === 'limits.ringHeight_m'));
  assert.equal(r.governing, null);
});
