// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { evaluate } from '../src/calc/evaluate.js';

const DIR = join(ROOT, 'verify/fixtures');
const fixtures = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

/**
 * @param {number} actual
 * @param {number} expected
 * @param {number} tol relative tolerance; an expected 0 must match exactly
 */
function within(actual, expected, tol) {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / Math.abs(expected) <= tol;
}

test('fixtures exist in the shared §8.3 format', () => {
  assert.ok(fixtures.length >= 8);
  for (const f of fixtures) {
    assert.equal(f.schema, 1);
    assert.equal(f.generator, 'python-fe 1.0');
    assert.deepEqual(Object.keys(f.expected).sort(), ['base_moment_Nm', 'f1_hz', 'mass_concrete_kg', 'mass_steel_kg']);
    assert.deepEqual(f.tolerance, { f1_hz: 0.03, mass_steel_kg: 0.005, mass_concrete_kg: 0.005, base_moment_Nm: 0.005 });
  }
});

for (const f of fixtures) {
  test(`JS evaluate matches Python FE: ${f.case}`, () => {
    const r = evaluate(f.inputs);
    assert.ok(r.f1 && r.masses && r.loads, JSON.stringify(r.errors));
    /** @type {[string, number][]} */
    const pairs = [
      ['f1_hz', r.f1.rayleigh_hz],
      ['mass_steel_kg', r.masses.steel_kg],
      ['mass_concrete_kg', r.masses.concrete_kg],
      ['base_moment_Nm', r.loads.baseMoment_Nm],
    ];
    for (const [k, v] of pairs) {
      const e = f.expected[k];
      assert.ok(within(v, e, f.tolerance[k]), `${k}: JS ${v} vs FE ${e} (${(((v - e) / e) * 100).toFixed(2)} %)`);
    }
  });
}

test('data/fe-reference.json matches the preset fixtures', () => {
  const ref = JSON.parse(readFileSync(join(ROOT, 'data/fe-reference.json'), 'utf8'));
  assert.equal(Object.keys(ref.cases).length, 6);
  for (const [c, v] of Object.entries(ref.cases)) {
    const f = fixtures.find((x) => x.case === c);
    assert.ok(f, c);
    assert.equal(/** @type {any} */ (v).f1_hz, f.expected.f1_hz);
  }
});
