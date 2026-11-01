// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heaviestLift } from '../src/calc/crane.js';

const steelSegments = [{ zBot: 0, zTop: 30, length_m: 30, dMax_m: 4.3, mass_kg: 70000 }];

test('heaviest lift picks the nacelle when it is heaviest; hook height = hub + 10 m', () => {
  const r = heaviestLift({ steelSegments, concreteMaxPart_kg: 0, massNacelle_kg: 240000, massRotor_kg: 110000, hubHeight_m: 90, hookAllowance_m: 10 });
  assert.deepEqual(r, { mass_kg: 240000, source: 'nacelle', hookHeight_m: 100 });
});

test('heaviest lift picks a steel segment or a concrete part when heavier', () => {
  const base = { massNacelle_kg: 50000, massRotor_kg: 40000, hubHeight_m: 90, hookAllowance_m: 10 };
  assert.equal(heaviestLift({ ...base, steelSegments, concreteMaxPart_kg: 0 }).source, 'steelSegment');
  assert.equal(heaviestLift({ ...base, steelSegments, concreteMaxPart_kg: 90000 }).source, 'concretePart');
  assert.equal(heaviestLift({ ...base, steelSegments: [], concreteMaxPart_kg: 0 }).source, 'nacelle');
});
