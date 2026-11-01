// @ts-check
import { test } from 'node:test';
import { assertRel } from './helpers.js';
import { circularHollow } from '../src/calc/section.js';

test('circularHollow D=4.0 t=0.020 matches hand calc', () => {
  const s = circularHollow(4.0, 0.020);
  assertRel(s.A, 0.250070775, 1e-6);
  assertRel(s.I, 0.4951652, 1e-6);
  assertRel(s.W, 0.2475826, 1e-6);
});

test('solid section when t = D/2', () => {
  assertRel(circularHollow(2, 1).I, Math.PI / 4, 1e-12);
});
