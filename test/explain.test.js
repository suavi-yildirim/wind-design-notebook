// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { evaluate, inputsFromPreset } from '../src/calc/evaluate.js';
import { createI18n } from '../src/i18n/i18n.js';
import { verdictSentence, cardSentence, scaleComparisons, checkLabel } from '../src/ui/explain.js';

const preset = (/** @type {string} */ id) => JSON.parse(readFileSync(join(ROOT, `data/presets/${id}.json`), 'utf8'));
const i18n = (/** @type {'de'|'en'} */ l) => createI18n(l, JSON.parse(readFileSync(join(ROOT, `src/i18n/${l}.json`), 'utf8')));
const r5 = evaluate(inputsFromPreset(preset('generic-5mw'), 'steel'));

test('verdict sentence names f1 and the governing check in both languages', () => {
  const de = verdictSentence(r5, i18n('de'));
  assert.match(de, /0,24 Hz/);
  assert.match(de, /Transportdurchmesser/);
  const en = verdictSentence(r5, i18n('en'));
  assert.match(en, /0\.24 Hz/);
  assert.match(en, /Transport diameter/);
});

test('verdict sentence for an invalid result asks to check the fields', () => {
  const inp = inputsFromPreset(preset('generic-5mw'), 'steel');
  inp.turbine.hubHeight_m = -1;
  assert.equal(verdictSentence(evaluate(inp), i18n('en')), i18n('en').t('verdict.noResult'));
});

test('card sentences exist for every card and contain no raw keys or NaN', () => {
  for (const r of [r5, evaluate(inputsFromPreset(preset('generic-7mw'), 'hybrid'))]) {
    for (const id of ['freq', 'stress', 'transport', 'crane', 'masses']) {
      const s = cardSentence(id, r, i18n('de'));
      assert.ok(s.length > 10 && !s.includes('card.') && !s.includes('NaN'), `${id}: ${s}`);
    }
  }
  assert.match(cardSentence('freq', evaluate(inputsFromPreset(preset('generic-3mw'), 'steel')), i18n('en')), /no free window/);
});

test('scale comparisons: cathedral ratio, cars, seconds per turn', () => {
  const [h, m, rpm] = scaleComparisons(r5, i18n('en'));
  assert.match(h, /0\.57 × Cologne Cathedral/);
  assert.match(m, /cars/);
  assert.match(rpm, /5\.0 s/);
  assert.equal(checkLabel('transport.d', i18n('de')), 'Transportdurchmesser');
});

test('verdict sentence says when a check was not assessed and flags resonance', () => {
  const r3 = evaluate(inputsFromPreset(preset('generic-3mw'), 'steel'));
  const de = verdictSentence(r3, i18n('de'));
  assert.match(de, /Eigenfrequenz nicht bewertet/);
  assert.match(de, /1P/);
  assert.match(verdictSentence(r3, i18n('en')), /Natural frequency not assessed/);
  assert.doesNotMatch(verdictSentence(r5, i18n('de')), /nicht bewertet/);
});
