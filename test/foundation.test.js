// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFoundation, baseRotation } from '../src/calc/foundation.js';

test('validateFoundation rejects non-positive k_phi', () => {
  assert.equal(validateFoundation(0)[0].key, 'error.foundation.kPhi');
  assert.equal(validateFoundation(-1)[0].field, 'foundation.kPhi_Nm_per_rad');
  assert.equal(validateFoundation(NaN).length, 1);
  assert.deepEqual(validateFoundation(1e11), []);
});

test('baseRotation = M / k_phi', () => {
  assert.equal(baseRotation(1e8, 1e11), 1e-3);
});
