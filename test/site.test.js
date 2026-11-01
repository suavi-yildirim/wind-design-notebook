// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { ROOT } from './helpers.js';

const EXCLUDE = new Set(['.git', 'docs', 'verify', 'test', '.github', 'node_modules', '.superpowers', '.claude', '_site', 'README.md']);

/** @param {string} dir @returns {string[]} */
function deployable(dir) {
  return readdirSync(dir).flatMap((f) => {
    if (dir === ROOT.replace(/\/$/, '') || dir === ROOT) { if (EXCLUDE.has(f) || f === 'package.json' || f.startsWith('.')) return []; }
    const p = join(dir, f);
    return statSync(p).isDirectory() ? deployable(p) : [p];
  });
}
const files = deployable(ROOT);
const html = files.filter((f) => f.endsWith('.html'));

test('the three pages exist', () => {
  for (const p of ['index.html', 'turm/index.html', 'about/index.html']) assert.ok(existsSync(join(ROOT, p)), p);
});

test('no root-absolute links (site lives under a base path)', () => {
  for (const f of html) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/(href|src)="\//.test(s), `${relative(ROOT, f)} has a root-absolute link`);
  }
});

test('every relative href/src in HTML points at an existing file', () => {
  for (const f of html) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|#|\?)/.test(url)) continue;
      let target = join(dirname(f), url.split(/[?#]/)[0]);
      if (url.endsWith('/') || statSync(target, { throwIfNoEntry: false })?.isDirectory()) target = join(target, 'index.html');
      assert.ok(existsSync(target), `${relative(ROOT, f)} → ${url}`);
    }
  }
});

test('page weight of the tower page (heaviest page, one language) without CDN libraries < 200 kB', () => {
  for (const [lang, other] of [['de', 'en'], ['en', 'de']]) {
    const page = files.map((f) => relative(ROOT, f)).filter((f) => !(
      f === 'index.html' || f.startsWith('about/') || f === 'src/ui/static-page.js' || f === 'data/presets/README.md'
      || f === `src/i18n/${other}.json` || f.startsWith(`content/${other}/`)
      || f === `content/${lang}/landing.md` || f === `content/${lang}/about.md`));
    const bytes = page.reduce((s, f) => s + statSync(join(ROOT, f)).size, 0);
    assert.ok(bytes < 200_000, `${lang}: ${bytes} bytes`);
  }
});

test('CDN script and style URLs are pinned to exact versions', () => {
  const src = files.filter((f) => /\.(html|js)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const m of src.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/([^/"']+)/g)) assert.match(m[1], /@\d+\.\d+\.\d+$/, m[1]);
});
