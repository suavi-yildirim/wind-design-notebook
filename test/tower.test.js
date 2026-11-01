// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRel } from './helpers.js';
import { uniformSteel, hybridTest } from './fixtures-inputs.js';
import { buildStations, massBetween, towerMasses } from '../src/calc/tower.js';
import { circularHollow } from '../src/calc/section.js';

test('uniform steel tower: 101 stations from 0 to H with mu = 7850·A·1.08', () => {
  const { H, stations, errors } = buildStations(uniformSteel());
  assert.deepEqual(errors, []);
  assert.equal(H, 100);
  assert.equal(stations.length, 101);
  assert.equal(stations[0].z, 0);
  assert.equal(stations[100].z, 100);
  const mu = 7850 * circularHollow(4, 0.02).A * 1.08;
  for (const s of stations) assertRel(s.mu, mu, 1e-12);
  assertRel(stations[0].EI, 210e9 * circularHollow(4, 0.02).I, 1e-12);
});

test('two zones 0.5/0.5: D continuous at the joint and linear inside each zone', () => {
  const inp = uniformSteel();
  inp.steel.segments = [
    { lengthFrac: 0.5, dBot_m: 6, dTop_m: 4.5, tBot_m: 0.04, tTop_m: 0.03 },
    { lengthFrac: 0.5, dBot_m: 4.5, dTop_m: 3, tBot_m: 0.03, tTop_m: 0.02 },
  ];
  const { stations } = buildStations(inp);
  const at = (/** @type {number} */ z) => /** @type {any} */ (stations.find((s) => Math.abs(s.z - z) < 1e-9));
  assertRel(at(25).D, 5.25, 1e-12);
  assertRel(at(50).D, 4.5, 1e-12);
  assertRel(at(75).D, 3.75, 1e-12);
  assertRel(at(75).t, 0.025, 1e-12);
});

test('hybrid H=150, hTr=60: 40 concrete intervals and a duplicated station at z=60', () => {
  const { stations, errors } = buildStations(hybridTest());
  assert.deepEqual(errors, []);
  assert.equal(stations.length, 102);
  const atTr = stations.filter((s) => Math.abs(s.z - 60) < 1e-9);
  assert.equal(atTr.length, 2);
  assert.equal(atTr[0].material, 'concrete');
  assert.equal(atTr[1].material, 'steel');
  assert.equal(stations.filter((s) => s.material === 'concrete').length, 41);
});

test('concrete mu has no k_add: mu = 2500·A', () => {
  const { stations } = buildStations(hybridTest());
  assertRel(stations[0].mu, 2500 * circularHollow(9, 0.35).A, 1e-12);
});

test('massBetween over the whole tower equals towerMasses total; uniform mass = mu·H', () => {
  const { stations } = buildStations(uniformSteel());
  const mu = stations[0].mu;
  assertRel(massBetween(stations, 0, 100), mu * 100, 1e-9);
  assertRel(massBetween(stations, 10, 35.5), mu * 25.5, 1e-9);
  const h = buildStations(hybridTest()).stations;
  const m = towerMasses(h);
  assertRel(massBetween(h, 0, 150), m.steel_kg + m.concrete_kg, 1e-9);
  assertRel(massBetween(h, 0, 150, 'concrete'), m.concrete_kg, 1e-12);
  assert.ok(m.concrete_kg > 0 && m.steel_kg > 0);
});

test('geometry errors are returned, never thrown', () => {
  const frac = uniformSteel();
  frac.steel.segments[0].lengthFrac = 0.9;
  assert.equal(buildStations(frac).errors[0].key, 'error.geom.fracSum');

  const thick = uniformSteel();
  thick.steel.segments[0].dTop_m = 0.03;
  const e = buildStations(thick).errors;
  assert.ok(e.some((x) => x.key === 'error.geom.tTooLarge' && x.field === 'steel.segments.0.tTop_m'), JSON.stringify(e));

  const neg = uniformSteel();
  neg.steel.segments[0].dBot_m = 0;
  assert.ok(buildStations(neg).errors.some((x) => x.key === 'error.geom.nonPositive' && x.field === 'steel.segments.0.dBot_m'));

  for (const hTr of [0, 150, 200]) {
    const h = hybridTest();
    h.hybrid.concrete.hTr_m = hTr;
    const r = buildStations(h);
    assert.ok(r.errors.some((x) => x.key === 'error.geom.hTrRange' && x.field === 'hybrid.concrete.hTr_m'));
    assert.deepEqual(r.stations, []);
  }
});
