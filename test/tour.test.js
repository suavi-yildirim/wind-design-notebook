// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { parseBlocks } from '../src/i18n/i18n.js';
import { TOUR_STEPS } from '../src/ui/tour.js';

test('four tour steps with text in both languages and existing presets', () => {
  assert.equal(TOUR_STEPS.length, 4);
  for (const lang of ['de', 'en']) {
    const blocks = parseBlocks(readFileSync(join(ROOT, `content/${lang}/tour.md`), 'utf8'));
    for (const s of TOUR_STEPS) assert.ok(blocks.get(s.id)?.trim(), `${lang} ${s.id}`);
  }
  for (const s of TOUR_STEPS) assert.ok(existsSync(join(ROOT, `data/presets/${s.preset}.json`)), s.preset);
});

test('tour targets exist on the tower page', () => {
  const html = readFileSync(join(ROOT, 'turm/index.html'), 'utf8');
  for (const s of TOUR_STEPS) {
    const id = s.target.split(' ')[0].slice(1);
    assert.ok(html.includes(`id="${id}"`), s.target);
  }
  assert.deepEqual(TOUR_STEPS.map((s) => [s.preset, s.type]),
    [['generic-5mw', 'steel'], ['generic-5mw', 'steel'], ['generic-7mw', 'steel'], ['generic-7mw', 'hybrid']]);
});
