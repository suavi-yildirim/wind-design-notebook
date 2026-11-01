// @ts-check
/** Language selection, UI strings, number/unit formatting and content blocks (spec §6). */

/** @typedef {'de'|'en'} Lang */
export const LANGS = /** @type {const} */ (['de', 'en']);

/** Display units: SI value × factor, default digits, label. */
export const UNITS = Object.freeze({
  m: { f: 1, d: 2, label: 'm' },
  mm: { f: 1e3, d: 0, label: 'mm' },
  t: { f: 1e-3, d: 1, label: 't' },
  kN: { f: 1e-3, d: 0, label: 'kN' },
  MNm: { f: 1e-6, d: 1, label: 'MN·m' },
  MPa: { f: 1e-6, d: 0, label: 'MPa' },
  Hz: { f: 1, d: 3, label: 'Hz' },
  rpm: { f: 1, d: 1, label: 'rpm' },
  MW: { f: 1e-6, d: 2, label: 'MW' },
  GNm_rad: { f: 1e-9, d: 0, label: 'GN·m/rad' },
  'm/s': { f: 1, d: 1, label: 'm/s' },
  pct: { f: 100, d: 0, label: '%' },
  '-': { f: 1, d: 2, label: '' },
});

/**
 * Language from `?lang=`, else stored preference, else German.
 * @param {string} search location.search
 * @param {string|null} stored
 * @returns {Lang}
 */
export function resolveLang(search, stored) {
  const q = new URLSearchParams(search).get('lang');
  if (q === 'de' || q === 'en') return q;
  if (stored === 'de' || stored === 'en') return stored;
  return 'de';
}

/**
 * @param {Lang} lang
 * @param {Record<string,string>} strings
 */
export function createI18n(lang, strings) {
  const warned = new Set();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  /** @type {Map<number, Intl.NumberFormat>} */
  const fmts = new Map();
  /**
   * @param {string} key
   * @param {Record<string, string|number>} [params]
   */
  function t(key, params) {
    const s = strings[key];
    if (s === undefined) {
      if (!warned.has(key)) { warned.add(key); console.warn(`i18n: missing "${key}" (${lang})`); }
      return key;
    }
    return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
  }
  /**
   * @param {number} x
   * @param {number} [digits]
   */
  function num(x, digits = 2) {
    if (!Number.isFinite(x)) return '—';
    let f = fmts.get(digits);
    if (!f) { f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }); fmts.set(digits, f); }
    return f.format(x);
  }
  /**
   * Format an SI value in a display unit, e.g. unit(794040, 'kN') → "794 kN".
   * @param {number} x
   * @param {keyof typeof UNITS} u
   * @param {number} [digits]
   */
  function unit(x, u, digits) {
    const def = UNITS[u];
    const s = num(x * def.f, digits ?? def.d);
    return def.label ? `${s} ${def.label}` : s;
  }
  return { lang, t, num, unit, has: (/** @type {string} */ k) => k in strings };
}

/** @typedef {ReturnType<typeof createI18n>} I18n */

/**
 * Split a markdown file into blocks keyed by `<!-- id: some.id -->` markers.
 * @param {string} md
 * @returns {Map<string,string>}
 */
export function parseBlocks(md) {
  const out = new Map();
  const re = /<!--\s*id:\s*([\w.-]+)\s*-->/g;
  /** @type {RegExpExecArray|null} */
  let m;
  /** @type {{ id:string, start:number }|null} */
  let cur = null;
  while ((m = re.exec(md))) {
    if (cur) out.set(cur.id, md.slice(cur.start, m.index));
    cur = { id: m[1], start: m.index + m[0].length };
  }
  if (cur) out.set(cur.id, md.slice(cur.start));
  return out;
}

/**
 * @param {Lang} lang
 * @returns {Promise<Record<string,string>>}
 */
export async function loadStrings(lang) {
  const res = await fetch(new URL(`./${lang}.json`, import.meta.url));
  return res.json();
}

/**
 * @param {Lang} lang
 * @param {string} name content file name without extension
 * @returns {Promise<Map<string,string>>}
 */
export async function loadContent(lang, name) {
  const res = await fetch(new URL(`../../content/${lang}/${name}.md`, import.meta.url));
  return parseBlocks(await res.text());
}
