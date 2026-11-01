// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRel } from './helpers.js';
import { uniformSteel } from './fixtures-inputs.js';
import { buildStations, towerMasses } from '../src/calc/tower.js';
import { thrust, momentLine } from '../src/calc/loads.js';

const inp = uniformSteel();
const { stations } = buildStations(inp);
const F_T = thrust({ rhoAir: 1.225, rotorDiameter_m: 126, ctRated: 0.8, ratedWind_mps: 11.4 });

test('thrust for 126 m rotor, CT 0.8, 11.4 m/s = 7.9404e5 N', () => {
  assertRel(F_T, 7.9404e5, 1e-3);
});

test('no drag (cf = 0): Md(0) = 1.35·1.5·F_T·H and Md(H) = 0', () => {
  const r = momentLine(stations, { thrust_N: F_T, mRna_kg: 1e5, ratedWind_mps: 11.4, assumptions: { ...inp.assumptions, cf: 0 } });
  assertRel(r.baseMoment_Nm, 1.35 * 1.5 * F_T * 100, 1e-9);
  assertRel(r.Md[0], r.baseMoment_Nm, 0);
  assert.equal(r.Md[r.Md.length - 1], 0);
  assert.equal(r.z.length, stations.length);
});

test('tower drag increases Md(0) and Md decreases with z', () => {
  const a = { thrust_N: F_T, mRna_kg: 1e5, ratedWind_mps: 11.4 };
  const noDrag = momentLine(stations, { ...a, assumptions: { ...inp.assumptions, cf: 0 } });
  const drag = momentLine(stations, { ...a, assumptions: inp.assumptions });
  assert.ok(drag.baseMoment_Nm > noDrag.baseMoment_Nm);
  for (let i = 1; i < drag.Md.length; i++) assert.ok(drag.Md[i] <= drag.Md[i - 1]);
});

test('normal force: N(H) = M_RNA·g·γ_G and N(0) = (M_RNA + tower)·g·γ_G', () => {
  const r = momentLine(stations, { thrust_N: F_T, mRna_kg: 1e5, ratedWind_mps: 11.4, assumptions: inp.assumptions });
  assertRel(r.N[r.N.length - 1], 1e5 * 9.81 * 1.35, 1e-9);
  assertRel(r.N[0], (1e5 + towerMasses(stations).steel_kg) * 9.81 * 1.35, 1e-9);
});
