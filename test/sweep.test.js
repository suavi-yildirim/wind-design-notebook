// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uniformSteel, hybridTest } from './fixtures-inputs.js';
import { sweep, applyCell } from '../src/calc/sweep.js';

test('steel sweep: 40×40 grid over hub height 80–180 m and base diameter 3.5–8.0 m', () => {
  const s = sweep(uniformSteel(), { kind: 'steel' });
  assert.equal(s.eta.length, 1600);
  assert.equal(s.governing.length, 1600);
  assert.equal(s.x.key, 'turbine.hubHeight_m');
  assert.equal(s.y.key, 'steel.segments.0.dBot_m');
  assert.deepEqual([s.x.values[0], s.x.values[39]], [80, 180]);
  assert.deepEqual([s.y.values[0], s.y.values[39]], [3.5, 8]);
  assert.deepEqual(s.current, { x: 100, y: 4 });
  assert.ok(s.governing.includes('transport.d'), 'large base diameters must be transport-governed');
});

test('applyCell sets both axis values and leaves the original untouched', () => {
  const inp = uniformSteel();
  const out = applyCell(inp, 'steel', 39, 0);
  assert.equal(out.turbine.hubHeight_m, 180);
  assert.equal(out.steel.segments[0].dBot_m, 3.5);
  assert.equal(inp.turbine.hubHeight_m, 100);
  const h = applyCell(hybridTest(), 'hybrid', 0, 39);
  assert.equal(h.type, 'hybrid');
  assert.equal(h.hybrid.concrete.hTr_m, 160);
});

test('hybrid sweep: cells with hTr > H − 20 are n/a, not infeasible', () => {
  const s = sweep(hybridTest(), { kind: 'hybrid' });
  assert.equal(s.y.key, 'hybrid.concrete.hTr_m');
  // ix 0 → H = 80; iy 39 → hTr = 160
  const i = 39 * 40 + 0;
  assert.equal(s.valid[i], 0);
  assert.ok(Number.isNaN(s.eta[i]));
  assert.equal(s.governing[i], null);
  // ix 39 → H = 180, iy 0 → hTr = 20 is valid
  assert.equal(s.valid[0 * 40 + 39], 1);
  assert.ok(Number.isFinite(s.eta[39]));
});

test('steel sweep runs in < 250 ms in Node after warm-up', () => {
  const inp = uniformSteel();
  sweep(inp, { kind: 'steel' });
  const t0 = performance.now();
  sweep(inp, { kind: 'steel' });
  const dt = performance.now() - t0;
  assert.ok(dt < 250, `sweep took ${dt.toFixed(1)} ms`);
});
