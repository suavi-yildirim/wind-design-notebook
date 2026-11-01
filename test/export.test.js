// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';
import { evaluate, inputsFromPreset } from '../src/calc/evaluate.js';
import { createI18n } from '../src/i18n/i18n.js';
import { utilisationCsv } from '../src/ui/export.js';

const preset = (/** @type {string} */ id) => JSON.parse(readFileSync(join(ROOT, `data/presets/${id}.json`), 'utf8'));
const i18n = (/** @type {'de'|'en'} */ l) => createI18n(l, JSON.parse(readFileSync(join(ROOT, `src/i18n/${l}.json`), 'utf8')));
const r = evaluate(inputsFromPreset(preset('generic-3mw'), 'hybrid'));

test('German CSV: BOM, semicolons, decimal comma, one row per check, governing marked', () => {
  const csv = utilisationCsv(r, i18n('de'));
  assert.ok(csv.startsWith('﻿'));
  const lines = csv.slice(1).trim().split('\r\n');
  assert.equal(lines[0], 'id;label;eta;demand;limit;unit;governing');
  assert.equal(lines.length, r.checks.length + 1);
  const gov = lines.find((l) => l.endsWith(';x'));
  assert.ok(gov?.startsWith(`${r.governing?.id};`));
  assert.match(lines[2], /^stress;[^;]+;0,\d\d\d;\d+,\d+;\d+,\d+;MPa;$/);
  assert.ok(!csv.includes('NaN'));
});

test('English CSV uses commas and a decimal point; empty-window η is blank', () => {
  const csv = utilisationCsv(r, i18n('en'));
  const lines = csv.slice(1).trim().split('\r\n');
  assert.equal(lines[0], 'id,label,eta,demand,limit,unit,governing');
  assert.match(lines[1], /^freq,Natural frequency,,0\.\d+,,Hz,$/);
});
