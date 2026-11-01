// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { evaluate, inputsFromPreset } from '../src/calc/evaluate.js';
import { addVariant, removeVariant, compareRows, MAX_VARIANTS } from '../src/ui/variants.js';
import { encodeState, decodeState } from '../src/ui/state.js';

const preset = (/** @type {string} */ id) => JSON.parse(readFileSync(join(ROOT, `data/presets/${id}.json`), 'utf8'));
/** @param {string} n */
const v = (n) => ({ name: n, preset: 'generic-5mw', type: /** @type {const} */ ('steel'), diff: {} });

test('at most three variants; a fourth replaces the oldest', () => {
  assert.equal(MAX_VARIANTS, 3);
  let list = /** @type {any[]} */ ([]);
  for (const n of ['a', 'b', 'c']) ({ list } = addVariant(list, v(n)));
  const r = addVariant(list, v('d'));
  assert.equal(r.replaced, true);
  assert.deepEqual(r.list.map((x) => x.name), ['b', 'c', 'd']);
  assert.deepEqual(removeVariant(r.list, 0).map((x) => x.name), ['c', 'd']);
});

test('compareRows lists the comparison rows in order with values per variant', () => {
  const a = evaluate(inputsFromPreset(preset('generic-5mw'), 'steel'));
  const b = evaluate(inputsFromPreset(preset('generic-7mw'), 'hybrid'));
  const rows = compareRows([a, b]);
  assert.deepEqual(rows.map((r) => r.key), ['type', 'hub', 'total', 'steel', 'concrete', 'segments', 'heaviest', 'f1', 'etaMax', 'governing']);
  const seg = rows.find((r) => r.key === 'segments');
  assert.deepEqual(seg?.values, [a.segments?.steel.length, b.segments?.steel.length]);
  assert.equal(rows.find((r) => r.key === 'governing')?.values[1], b.governing?.id);
  assert.equal(rows.find((r) => r.key === 'concrete')?.values[0], 0);
});

test('variants survive encodeState/decodeState', () => {
  const s = { v: /** @type {const} */ (1), preset: 'generic-5mw', type: /** @type {const} */ ('steel'), diff: {}, variants: [v('x'), { ...v('y'), diff: { 'turbine.hubHeight_m': 110 } }] };
  const d = decodeState('#s=' + encodeState(s), ['generic-5mw']);
  assert.ok(d.ok);
  assert.deepEqual(d.state.variants, s.variants);
});
