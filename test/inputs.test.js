// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uniformSteel } from './fixtures-inputs.js';
import { parseNumber, fieldsFor, toDisplay, toSI } from '../src/ui/inputs.js';
import { getPath } from '../src/ui/state.js';

test('German decimal comma is parsed as a decimal, not rejected or read as 43', () => {
  assert.equal(parseNumber('4,3', 'de'), 4.3);
  assert.equal(parseNumber('4.3', 'en'), 4.3);
  assert.equal(parseNumber('1.234,5', 'de'), 1234.5);
  assert.equal(parseNumber('4.3', 'de'), 4.3);
  assert.equal(parseNumber('1,234.5', 'en'), 1234.5);
  assert.equal(parseNumber(' 12 ', 'de'), 12);
  assert.ok(Number.isNaN(parseNumber('abc', 'de')));
  assert.ok(Number.isNaN(parseNumber('', 'de')));
});

test('fieldsFor lists turbine, geometry, foundation, limits and assumption fields that exist in the inputs', () => {
  const inp = uniformSteel();
  const f = fieldsFor(inp);
  for (const x of f) assert.equal(typeof getPath(inp, x.path), 'number', x.path);
  assert.ok(f.some((x) => x.path === 'steel.segments.0.tBot_m' && x.unit === 'mm'));
  assert.ok(f.some((x) => x.path === 'foundation.kPhi_Nm_per_rad' && x.unit === 'GNm_rad'));
  assert.ok(!f.some((x) => x.path.startsWith('hybrid.')), 'steel tower shows no hybrid fields');
  inp.type = 'hybrid';
  assert.ok(fieldsFor(inp).some((x) => x.path === 'hybrid.concrete.hTr_m'));
  assert.deepEqual([...new Set(f.map((x) => x.group))], ['turbine', 'geometry', 'foundation', 'limits', 'assumptions']);
});

test('display ↔ SI conversion uses the unit factor', () => {
  assert.equal(toDisplay(0.035, 'mm'), 35);
  assert.equal(toSI(35, 'mm'), 0.035);
  assert.equal(toSI(240, 't'), 240000);
  assert.equal(toSI(150, 'GNm_rad'), 150e9);
});
