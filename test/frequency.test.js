// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRel } from './helpers.js';
import { uniformSteel } from './fixtures-inputs.js';
import { buildStations, towerMasses } from '../src/calc/tower.js';
import { handFormula, rayleigh, bands, freqEta } from '../src/calc/frequency.js';

const inp = uniformSteel();
const { stations } = buildStations(inp);
const mRna = 100000;
const EI = stations.reduce((s, x) => s + x.EI, 0) / stations.length;

test('hand formula for the uniform tower = 0.228850 Hz', () => {
  const f = handFormula({ H: 100, EI, kPhi: 1e15, mRna, mTower: towerMasses(stations).steel_kg });
  assertRel(f, 0.228850, 1e-4);
});

test('Rayleigh within 1 % of the hand formula for the uniform tower', () => {
  const hand = handFormula({ H: 100, EI, kPhi: 1e15, mRna, mTower: towerMasses(stations).steel_kg });
  const { f1_hz, w } = rayleigh(stations, { kPhi: 1e15, mRna });
  assertRel(f1_hz, hand, 0.01);
  assert.equal(w.length, stations.length);
  assert.equal(w[0], 0);
});

test('a softer foundation lowers f1', () => {
  const stiff = rayleigh(stations, { kPhi: 1e15, mRna }).f1_hz;
  const soft = rayleigh(stations, { kPhi: 5e10, mRna }).f1_hz;
  assert.ok(soft < stiff, `${soft} < ${stiff}`);
});

test('bands(6.9, 12.1, 0.1) gives the 1P/3P bands and the soft-stiff window', () => {
  const b = bands(6.9, 12.1, 0.1);
  assertRel(b.p1[0], 0.115, 1e-9);
  assertRel(b.p1[1], 0.201667, 1e-5);
  assertRel(b.p3[0], 0.345, 1e-9);
  assertRel(b.p3[1], 0.605, 1e-9);
  assert.ok(b.window);
  assertRel(b.window[0], 0.221833, 1e-5);
  assertRel(b.window[1], 0.3105, 1e-9);
});

test('freqEta is exactly 1.0 at both window edges and 0.853 at 0.26 Hz', () => {
  const b = bands(6.9, 12.1, 0.1);
  assert.ok(b.window);
  assert.ok(Math.abs(/** @type {number} */ (freqEta(b.window[0], b)) - 1) < 1e-12);
  assert.ok(Math.abs(/** @type {number} */ (freqEta(b.window[1], b)) - 1) < 1e-12);
  assertRel(/** @type {number} */ (freqEta(0.26, b)), 0.8532, 1e-3);
});

test('empty window: window null and freqEta null', () => {
  const b = bands(3.8, 11.75, 0.1);
  assert.equal(b.window, null);
  assert.equal(freqEta(0.2, b), null);
});
