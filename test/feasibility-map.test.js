// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { inputsFromPreset } from '../src/calc/evaluate.js';
import { sweep } from '../src/calc/sweep.js';
import { createI18n } from '../src/i18n/i18n.js';
import { feasibilityMapSvg, CHECK_COLORS } from '../src/charts/feasibility-map.js';

const preset = (/** @type {string} */ id) => JSON.parse(readFileSync(join(ROOT, `data/presets/${id}.json`), 'utf8'));
const i18n = createI18n('en', JSON.parse(readFileSync(join(ROOT, 'src/i18n/en.json'), 'utf8')));

test('steel map: 1600 cells, current marker, legend only for occurring checks', () => {
  const s = sweep(inputsFromPreset(preset('generic-5mw'), 'steel'), { kind: 'steel' });
  const { svg, legend } = feasibilityMapSvg(s, i18n);
  assert.equal((svg.match(/<rect class="cell/g) ?? []).length, 1600);
  assert.match(svg, /class="current"/);
  assert.match(svg, /role="img"/);
  const occurring = new Set(s.governing.filter(Boolean));
  assert.deepEqual(legend.map((l) => l.id).filter((id) => id in CHECK_COLORS).sort(), [...occurring].sort());
  assert.ok(legend.some((l) => l.id === 'infeasible'));
});

test('hybrid map marks undefined cells as n/a with data attributes for the click', () => {
  const s = sweep(inputsFromPreset(preset('generic-7mw'), 'hybrid'), { kind: 'hybrid' });
  const { svg } = feasibilityMapSvg(s, i18n);
  assert.match(svg, /<rect class="cell na" data-ix="0" data-iy="39"/);
  assert.ok(svg.includes('data-ix="39" data-iy="0"'));
  assert.ok(!svg.includes('NaN'));
});
