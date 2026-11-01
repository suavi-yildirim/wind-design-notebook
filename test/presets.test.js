// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { evaluate, inputsFromPreset } from '../src/calc/evaluate.js';
import { ROOT } from './helpers.js';

const IDS = ['generic-3mw', 'generic-5mw', 'generic-7mw'];
const TURBINE_KEYS = ['ratedPower_W', 'rotorDiameter_m', 'hubHeight_m', 'rpmMin', 'rpmMax', 'ratedWind_mps', 'ctRated', 'massNacelle_kg', 'massRotor_kg'];
/** @param {string} id */
const load = (id) => JSON.parse(readFileSync(join(ROOT, 'data/presets', `${id}.json`), 'utf8'));

test('presets follow schema 1 and every turbine value has exactly one source with a page', () => {
  for (const id of IDS) {
    const p = load(id);
    assert.equal(p.schema, 1);
    assert.equal(p.id, id);
    assert.equal(p.towers.steel.label, 'author-concept');
    assert.equal(p.towers.hybrid.label, 'author-concept');
    for (const k of TURBINE_KEYS) {
      const owners = p.sources.filter((/** @type {any} */ s) => s.fields.includes(k));
      assert.equal(owners.length, 1, `${id}.${k} sources: ${owners.length}`);
      assert.ok(owners[0].page && owners[0].title, `${id}.${k} page/title`);
    }
  }
});

test('all six preset cases evaluate; only the expected empty-window errors occur', () => {
  for (const id of IDS) {
    for (const type of /** @type {const} */ (['steel', 'hybrid'])) {
      const r = evaluate(inputsFromPreset(load(id), type));
      const keys = r.errors.map((e) => e.key);
      if (id === 'generic-5mw') assert.deepEqual(keys, [], `${id} ${type}`);
      else assert.deepEqual(keys, ['error.freq.emptyWindow'], `${id} ${type}`);
      assert.ok(r.governing, `${id} ${type} has a governing check`);
    }
  }
});

test('the preset story holds: 3/5 MW and 7 MW hybrid pass, 7 MW steel fails on transport diameter', () => {
  for (const [id, type] of /** @type {const} */ ([['generic-3mw', 'steel'], ['generic-3mw', 'hybrid'], ['generic-5mw', 'steel'], ['generic-5mw', 'hybrid'], ['generic-7mw', 'hybrid']])) {
    const r = evaluate(inputsFromPreset(load(id), type));
    assert.ok(/** @type {number} */ (r.governing?.eta) <= 1, `${id} ${type} η ${r.governing?.eta}`);
  }
  const r7 = evaluate(inputsFromPreset(load('generic-7mw'), 'steel'));
  assert.equal(r7.governing?.id, 'transport.d');
  assert.ok(/** @type {number} */ (r7.governing?.eta) > 1);
  const r5 = evaluate(inputsFromPreset(load('generic-5mw'), 'steel'));
  assert.ok(r5.bands?.window && r5.f1 && r5.f1.rayleigh_hz > r5.bands.window[0] && r5.f1.rayleigh_hz < r5.bands.window[1]);
});

const DENY = /vestas|siemens|gamesa|enercon|nordex|senvion|repower|goldwind|mingyang|suzlon|general electric|ge vernova|b[öo]gl/i;

/** @param {string} dir @returns {string[]} */
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test('no manufacturer names in data, content, source code or pages', () => {
  const scan = ['data', 'content', 'src', 'assets', 'turm', 'about'].flatMap((d) => files(join(ROOT, d)))
    .concat(existsSync(join(ROOT, 'index.html')) ? [join(ROOT, 'index.html')] : []);
  for (const f of scan) {
    const m = readFileSync(f, 'utf8').match(DENY);
    assert.equal(m, null, `${f} mentions "${m?.[0]}"`);
  }
});
