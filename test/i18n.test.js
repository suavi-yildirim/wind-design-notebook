// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { resolveLang, createI18n, parseBlocks } from '../src/i18n/i18n.js';
import { ASSUMPTIONS_BY_CHECK } from '../src/calc/evaluate.js';

/** @param {string} p */
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const de = JSON.parse(read('src/i18n/de.json'));
const en = JSON.parse(read('src/i18n/en.json'));
const calcSrc = readdirSync(join(ROOT, 'src/calc')).map((f) => read(`src/calc/${f}`)).join('\n');
const uiSrc = ['src/ui', 'src/charts'].flatMap((d) => {
  try { return readdirSync(join(ROOT, d)).map((f) => read(`${d}/${f}`)); } catch { return []; }
}).join('\n');

test('DE and EN UI string files have the same keys and no empty values', () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  for (const [k, v] of Object.entries({ ...de, ...en })) assert.ok(typeof v === 'string' && v.length > 0, k);
});

test('content files have the same block IDs in both languages', () => {
  const files = readdirSync(join(ROOT, 'content/de')).filter((f) => f.endsWith('.md'));
  assert.deepEqual(files.sort(), readdirSync(join(ROOT, 'content/en')).filter((f) => f.endsWith('.md')).sort());
  for (const f of files) {
    const a = [...parseBlocks(read(`content/de/${f}`)).keys()].sort();
    const b = [...parseBlocks(read(`content/en/${f}`)).keys()].sort();
    assert.deepEqual(a, b, f);
    for (const id of a) assert.ok(parseBlocks(read(`content/de/${f}`)).get(id)?.trim(), `${f}:${id} empty`);
  }
});

test('every formulaId used in src/calc exists in content/formulas.json', () => {
  const formulas = JSON.parse(read('content/formulas.json'));
  const ids = [...calcSrc.matchAll(/'((?:check|f1|load|section|bands|scaling)\.[a-zA-Z0-9.]+)'/g)].map((m) => m[1]);
  assert.ok(ids.length > 5);
  for (const id of ids) if (!id.startsWith('check.') || ['check.freq', 'check.stress', 'check.transport', 'check.concrete', 'check.crane'].includes(id)) {
    assert.ok(formulas[id], `formula ${id} missing`);
  }
});

test('every error, lever and assumption key used in code exists', () => {
  const keys = new Set([...(calcSrc + uiSrc).matchAll(/'((?:error|lever)\.[a-zA-Z0-9.]+)'/g)].map((m) => m[1]));
  for (const k of keys) assert.ok(de[k], `string ${k} missing`);
  const asm = parseBlocks(read('content/de/assumptions.md'));
  for (const id of Object.values(ASSUMPTIONS_BY_CHECK).flat()) assert.ok(asm.has(id), `assumption ${id} missing`);
});

test('every limitation from spec §9 has a block', () => {
  const lim = [...parseBlocks(read('content/de/limitations.md')).keys()];
  assert.ok(lim.length >= 14, `only ${lim.length} limitations`);
  assert.ok(lim.includes('lim.hubOffset') && lim.includes('lim.fatigue') && lim.includes('lim.buckling'));
});

test('resolveLang: URL beats storage, unknown falls back to de', () => {
  assert.equal(resolveLang('?lang=en', 'de'), 'en');
  assert.equal(resolveLang('?lang=fr', null), 'de');
  assert.equal(resolveLang('', 'en'), 'en');
  assert.equal(resolveLang('', 'xx'), 'de');
});

test('t fills placeholders and returns the key when missing', () => {
  const i = createI18n('de', { 'a.b': 'f = {f} Hz' });
  assert.equal(i.t('a.b', { f: '0,25' }), 'f = 0,25 Hz');
  assert.equal(i.t('missing.key'), 'missing.key');
});

test('num formats per locale; unit converts SI to display units', () => {
  assert.equal(createI18n('de', {}).num(1234.5, 1), '1.234,5');
  assert.equal(createI18n('en', {}).num(1234.5, 1), '1,234.5');
  const i = createI18n('en', {});
  assert.equal(i.unit(794040, 'kN'), '794 kN');
  assert.equal(i.unit(160e6, 'MNm'), '160.0 MN·m');
  assert.equal(i.unit(0.0354, 'mm'), '35 mm');
  assert.equal(i.unit(240000, 't'), '240.0 t');
});

test('parseBlocks splits markdown on id markers', () => {
  const m = parseBlocks('<!-- id: a.one -->\nHello\n\n<!-- id: a.two -->\nWorld\n');
  assert.equal(m.get('a.one')?.trim(), 'Hello');
  assert.equal(m.get('a.two')?.trim(), 'World');
});
