// @ts-check
/** Shared page setup: language, static strings, language toggle, glossary tooltips, markdown. */
import { resolveLang, createI18n, loadStrings } from '../i18n/i18n.js';

/** @typedef {import('../i18n/i18n.js').I18n} I18n */

export const PREF_KEY = 'wdn.lang';
export const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';

/** @returns {string|null} */
function storedLang() {
  try { return localStorage.getItem(PREF_KEY); } catch { return null; }
}

/** Resolve the language, set `<html lang>` and load the UI strings. */
export async function initI18n() {
  const lang = resolveLang(location.search, storedLang());
  document.documentElement.lang = lang;
  try { localStorage.setItem(PREF_KEY, lang); } catch { /* private mode */ }
  return createI18n(lang, await loadStrings(lang));
}

/**
 * Fill `[data-i18n]` text and `[data-i18n-attr="attr:key;attr:key"]` attributes.
 * @param {ParentNode} root
 * @param {I18n} i18n
 */
export function applyStatic(root, i18n) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = i18n.t(/** @type {string} */ (/** @type {HTMLElement} */ (el).dataset.i18n));
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of /** @type {string} */ (/** @type {HTMLElement} */ (el).dataset.i18nAttr).split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, i18n.t(key));
    }
  }
}

/**
 * The language link points at the same page with the other `?lang=` and keeps the hash.
 * @param {HTMLAnchorElement} a
 * @param {I18n} i18n
 */
export function setupLangToggle(a, i18n) {
  const other = i18n.lang === 'de' ? 'en' : 'de';
  const update = () => {
    const u = new URL(location.href);
    u.searchParams.set('lang', other);
    a.href = u.search + u.hash;
  };
  update();
  a.lang = other;
  a.textContent = i18n.t('lang.switch');
  a.addEventListener('click', () => {
    try { localStorage.setItem(PREF_KEY, other); } catch { /* ignore */ }
    update();
  });
}

/**
 * Glossary tooltips: `<span data-term="Eigenfrequenz">` gets a title in the current language.
 * @param {ParentNode} root
 * @param {Record<string, { en:string, de:string, en_def:string }>} glossary
 * @param {'de'|'en'} lang
 */
export function applyGlossary(root, glossary, lang) {
  for (const el of root.querySelectorAll('[data-term]')) {
    const g = glossary[/** @type {string} */ (/** @type {HTMLElement} */ (el).dataset.term)];
    if (!g) continue;
    el.setAttribute('title', lang === 'de' ? `${g.de} (EN: ${g.en})` : `${g.en_def}`);
    el.classList.add('term');
    el.setAttribute('tabindex', '0');
  }
}

/** @type {Promise<(md:string) => string> | null} */
let markedP = null;

/**
 * Markdown → HTML via marked (CDN, pinned). Falls back to escaped text if the CDN is unreachable.
 * Content comes from this repository only.
 * @param {string} md
 */
export async function markdown(md) {
  markedP ??= import(MARKED_URL).then((m) => (/** @type {string} */ s) => /** @type {string} */ (m.marked.parse(s, { async: false })))
    .catch(() => (/** @type {string} */ s) => `<p>${escapeHtml(s)}</p>`);
  return (await markedP)(md);
}

/** @param {string} s */
export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/**
 * @param {string} path relative to the repository root, e.g. "data/presets/generic-5mw.json"
 */
export async function fetchJson(path) {
  const res = await fetch(new URL(`../../${path}`, import.meta.url));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
