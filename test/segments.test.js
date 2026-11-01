// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRel } from './helpers.js';
import { hybridTest } from './fixtures-inputs.js';
import { buildStations, massBetween } from '../src/calc/tower.js';
import { splitSteel, balanceSteel, concreteRings } from '../src/calc/segments.js';

/**
 * Synthetic steel stations at 1 m spacing with constant D and μ.
 * @param {number} H
 * @param {number} mu
 * @returns {import('../src/calc/types.js').Station[]}
 */
function synth(H, mu) {
  return Array.from({ length: H + 1 }, (_, z) => ({ z, D: 4 + (H - z) * 0.001, t: 0.02, A: 0, I: 0, W: 0, EI: 1, mu, material: /** @type {const} */ ('steel') }));
}
const lengths = (/** @type {{length_m:number}[]} */ s) => s.map((x) => x.length_m);

test('H=90, Lmax 30: three segments of exactly 30 m', () => {
  assert.deepEqual(lengths(splitSteel(synth(90, 1000), { lMax_m: 30, mMax_kg: 80000 })), [30, 30, 30]);
});

test('H=95: 30, 30, 30 from the top and 5 m at the bottom (ordered bottom to top)', () => {
  const s = splitSteel(synth(95, 1000), { lMax_m: 30, mMax_kg: 80000 });
  assert.deepEqual(lengths(s), [5, 30, 30, 30]);
  assert.equal(s[0].zBot, 0);
  assert.equal(s[3].zTop, 95);
  assertRel(s[1].mass_kg, 30000, 1e-12);
  assertRel(s[0].dMax_m, 4.095, 1e-12);
});

test('mu=4000, mMax 80 t: 20 m segments exactly at m_max', () => {
  assert.deepEqual(lengths(splitSteel(synth(60, 4000), { lMax_m: 30, mMax_kg: 80000 })), [20, 20, 20]);
});

test('tower shorter than Lmax: one segment', () => {
  assert.deepEqual(lengths(splitSteel(synth(20, 1000), { lMax_m: 30, mMax_kg: 80000 })), [20]);
});

test('a single interval exceeding Lmax forms its own segment', () => {
  const st = synth(1, 1000).map((s) => ({ ...s, z: s.z * 40 }));
  assert.deepEqual(lengths(splitSteel(st, { lMax_m: 30, mMax_kg: 80000 })), [40]);
});

test('hybrid: only steel stations are split', () => {
  const { stations } = buildStations(hybridTest());
  const s = splitSteel(stations, { lMax_m: 30, mMax_kg: 80000 });
  assert.equal(s[0].zBot, 60);
  assert.equal(s[s.length - 1].zTop, 150);
});

test('rings: hTr 60, h_ring 3.8 → 16 rings, last 3.0 m, part mass = ring mass / 2', () => {
  const { stations } = buildStations(hybridTest());
  const r = concreteRings(stations, { hTr_m: 60, ringHeight_m: 3.8, ringParts: 2 });
  assert.equal(r.count, 16);
  assertRel(r.rings[15].zTop - r.rings[15].zBot, 3.0, 1e-9);
  assertRel(r.partMass_kg[0], massBetween(stations, 0, 3.8, 'concrete') / 2, 1e-12);
  assert.equal(r.maxPartMass_kg, Math.max(...r.partMass_kg));
  assertRel(r.rings.reduce((s, x) => s + x.mass_kg, 0), massBetween(stations, 0, 60, 'concrete'), 1e-9);
});

test('balanced split keeps the greedy count but evens out lengths (H=95 → 4 × ~24 m)', () => {
  const s = balanceSteel(synth(95, 1000), { lMax_m: 30, mMax_kg: 80000 });
  assert.equal(s.length, 4);
  for (const x of s) assert.ok(x.length_m <= 24 && x.length_m >= 23, `len ${x.length_m}`);
  assert.equal(s[0].zBot, 0);
  assert.equal(s[3].zTop, 95);
});

test('balanced split stays at the limit when the tower is an exact multiple (H=90 → 3 × 30 m)', () => {
  assert.deepEqual(lengths(balanceSteel(synth(90, 1000), { lMax_m: 30, mMax_kg: 80000 })), [30, 30, 30]);
});
