// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fyS355, verdict, pickGoverning } from '../src/calc/checks.js';

test('fyS355 follows the thickness table and returns null above 80 mm', () => {
  assert.equal(fyS355(0.016), 355e6);
  assert.equal(fyS355(0.0161), 345e6);
  assert.equal(fyS355(0.040), 345e6);
  assert.equal(fyS355(0.063), 335e6);
  assert.equal(fyS355(0.080), 325e6);
  assert.equal(fyS355(0.081), null);
});

test('verdict thresholds: green ≤ 0.9 < amber ≤ 1.0 < red', () => {
  assert.equal(verdict(0.9), 'green');
  assert.equal(verdict(0.9001), 'amber');
  assert.equal(verdict(1.0), 'amber');
  assert.equal(verdict(1.0001), 'red');
  assert.equal(verdict(null), 'none');
});

test('governing = check with max η, null η ignored', () => {
  const c = (/** @type {string} */ id, /** @type {number|null} */ eta) =>
    ({ id, eta, limit: 1, demand: 1, unit: '', formulaId: '', assumptionIds: [], governingInput: '' });
  assert.equal(pickGoverning([c('a', 0.5), c('b', null), c('c', 0.7)])?.id, 'c');
  assert.equal(pickGoverning([c('b', null)]), null);
});
