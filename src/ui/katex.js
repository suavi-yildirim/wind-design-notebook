// @ts-check
/** Lazy KaTeX (CDN, pinned). Until it has loaded, formulas show as TeX source. */
import { escapeHtml } from './page-common.js';

export const KATEX_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.mjs';

/** @type {any} */
let katex = null;
/** @type {Promise<void>|null} */
let loading = null;
/** @type {(() => void)[]} */
const waiting = [];

/**
 * @param {string} src TeX
 * @param {() => void} [onReady] called once when KaTeX becomes available (to re-render)
 * @returns {string} HTML
 */
export function tex(src, onReady) {
  if (katex) return katex.renderToString(src, { throwOnError: false, displayMode: true, output: 'html' });
  if (onReady) waiting.push(onReady);
  loading ??= import(KATEX_URL).then((m) => {
    katex = m.default ?? m;
    for (const f of waiting.splice(0)) f();
  }).catch(() => { /* offline: keep TeX source */ });
  return `<code class="tex">${escapeHtml(src)}</code>`;
}
