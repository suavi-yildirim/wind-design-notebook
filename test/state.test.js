// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uniformSteel } from './fixtures-inputs.js';
import { encodeState, decodeState, diffInputs, applyDiff, getPath, setPath } from '../src/ui/state.js';

const PRESETS = ['generic-3mw', 'generic-5mw', 'generic-7mw'];
const b64 = (/** @type {string} */ s) => Buffer.from(s, 'utf8').toString('base64url');

test('encode → decode round trip (including non-ASCII names)', () => {
  const s = { v: 1, preset: 'generic-5mw', type: 'hybrid', diff: { 'turbine.hubHeight_m': 120 }, variants: [{ name: 'Variante ä', preset: 'generic-3mw', type: 'steel', diff: {} }] };
  const d = decodeState('#s=' + encodeState(s), PRESETS);
  assert.ok(d.ok);
  assert.deepEqual(d.state, s);
});

test('diffInputs holds only changed numeric paths; applyDiff reproduces the inputs', () => {
  const base = uniformSteel();
  const cur = structuredClone(base);
  cur.turbine.hubHeight_m = 120;
  cur.steel.segments[0].tBot_m = 0.03;
  const diff = diffInputs(base, cur);
  assert.deepEqual(diff, { 'turbine.hubHeight_m': 120, 'steel.segments.0.tBot_m': 0.03 });
  const r = applyDiff(base, diff);
  assert.deepEqual(r.inputs, cur);
  assert.deepEqual(r.unknownPaths, []);
  assert.equal(base.turbine.hubHeight_m, 100, 'base not mutated');
});

test('decodeState rejects broken, old or unknown state with a reason', () => {
  assert.deepEqual(decodeState('', PRESETS), { ok: false, reason: 'empty' });
  assert.equal(decodeState('#s=%%%', PRESETS).ok, false);
  assert.equal(decodeState('#s=' + b64('{not json'), PRESETS).ok, false);
  const v2 = decodeState('#s=' + b64('{"v":2,"preset":"generic-5mw","type":"steel","diff":{}}'), PRESETS);
  assert.deepEqual(v2, { ok: false, reason: 'version' });
  const unknown = decodeState('#s=' + b64('{"v":1,"preset":"acme-9mw","type":"steel","diff":{}}'), PRESETS);
  assert.deepEqual(unknown, { ok: false, reason: 'preset' });
  const badType = decodeState('#s=' + b64('{"v":1,"preset":"generic-5mw","type":"wood","diff":{}}'), PRESETS);
  assert.equal(badType.ok, false);
});

test('applyDiff reports paths that no longer exist and ignores non-numbers', () => {
  const base = uniformSteel();
  const r = applyDiff(base, { 'steel.segments.9.dBot_m': 5, 'turbine.hubHeight_m': 'x', 'turbine.rpmMin': 7 });
  assert.deepEqual(r.unknownPaths.sort(), ['steel.segments.9.dBot_m', 'turbine.hubHeight_m']);
  assert.equal(r.inputs.turbine.rpmMin, 7);
  assert.equal(r.inputs.turbine.hubHeight_m, 100);
});

test('getPath / setPath walk dotted paths with array indices', () => {
  const i = uniformSteel();
  assert.equal(getPath(i, 'steel.segments.0.dBot_m'), 4);
  setPath(i, 'steel.segments.0.dBot_m', 5);
  assert.equal(i.steel.segments[0].dBot_m, 5);
  assert.equal(getPath(i, 'nope.x'), undefined);
});

test('hash paths into array internals are rejected (no crash from segments.length)', () => {
  const base = uniformSteel();
  for (const p of ['steel.segments.length', 'hybrid.steel.segments.length', 'turbine.constructor', 'steel.segments.0.__proto__']) {
    const r = applyDiff(base, { [p]: 50 });
    assert.deepEqual(r.unknownPaths, [p], p);
    assert.equal(r.inputs.steel.segments.length, 1);
  }
  assert.equal(getPath(base, 'steel.segments.length'), undefined);
});
