// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { evaluate, inputsFromPreset } from '../src/calc/evaluate.js';
import { createI18n } from '../src/i18n/i18n.js';
import { towerSketchSvg } from '../src/charts/tower-sketch.js';
import { campbellSvg } from '../src/charts/campbell.js';
import { utilisationBarsSvg, massBarsSvg } from '../src/charts/utilisation-bars.js';
import { dataTable, esc } from '../src/charts/svg.js';

const preset = (/** @type {string} */ id) => JSON.parse(readFileSync(join(ROOT, `data/presets/${id}.json`), 'utf8'));
const i18n = createI18n('de', JSON.parse(readFileSync(join(ROOT, 'src/i18n/de.json'), 'utf8')));
const r5 = evaluate(inputsFromPreset(preset('generic-5mw'), 'steel'));
const r7h = evaluate(inputsFromPreset(preset('generic-7mw'), 'hybrid'));
const r3 = evaluate(inputsFromPreset(preset('generic-3mw'), 'steel'));

/** @param {string} svg */
function accessible(svg) {
  assert.match(svg, /^<svg[^>]*role="img"/);
  assert.match(svg, /aria-label="[^"]+"/);
  assert.match(svg, /<title>[^<]+<\/title>/);
  assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), 'no NaN/undefined');
}

test('tower sketch: accessible, joints per segment, concrete group for hybrids', () => {
  const s = towerSketchSvg(r5, i18n);
  accessible(s);
  assert.equal((s.match(/class="joint /g) ?? []).length, /** @type {any} */ (r5.segments).steel.length - 1);
  assert.ok(!s.includes('class="concrete"'));
  const h = towerSketchSvg(r7h, i18n);
  accessible(h);
  assert.ok(h.includes('class="concrete"'));
});

test('campbell: accessible, f1 line with its value, window band only when the window exists', () => {
  const s = campbellSvg(r5, i18n);
  accessible(s);
  assert.match(s, /class="f1" data-f1="0\.23/);
  assert.ok(s.includes('class="window"'));
  const e = campbellSvg(r3, i18n);
  accessible(e);
  assert.ok(!e.includes('class="window"'));
});

test('utilisation bars: governing bar highlighted, η = 1 reference line, null η shown as —', () => {
  const s = utilisationBarsSvg(r3.checks, i18n);
  accessible(s);
  assert.equal((s.match(/class="bar governing/g) ?? []).length, 1);
  assert.ok(s.includes('class="eta-one"'));
  assert.ok(s.includes('>—<'));
});

test('mass bars and data tables escape text', () => {
  accessible(massBarsSvg(r7h, i18n));
  assert.equal(esc('<a&"b">'), '&lt;a&amp;&quot;b&quot;&gt;');
  const t = dataTable('T', ['a', 'b'], [['1', '<2>']]);
  assert.match(t, /<details class="data-table">/);
  assert.ok(t.includes('&lt;2&gt;'));
});

test('campbell with an inverted rpm range draws no negative widths', () => {
  const inp = inputsFromPreset(preset('generic-5mw'), 'steel');
  inp.turbine.rpmMin = 13;
  const s = campbellSvg(evaluate(inp), i18n);
  assert.doesNotMatch(s, /width="-/);
});
