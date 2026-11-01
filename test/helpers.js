// @ts-check
import assert from 'node:assert/strict';

/**
 * Assert that `actual` is within a relative tolerance of `expected`.
 * @param {number} actual
 * @param {number} expected
 * @param {number} rel
 * @param {string} [msg]
 */
export function assertRel(actual, expected, rel, msg) {
  const err = Math.abs(actual - expected) / Math.abs(expected);
  assert.ok(err <= rel, `${msg ?? ''} expected ${expected}, got ${actual} (rel err ${err.toExponential(2)} > ${rel})`);
}
