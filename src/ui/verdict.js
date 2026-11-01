// @ts-check
/** Header verdict: traffic light, plain-language sentence, scale comparisons (spec §7.2 item 1). */
import { verdictSentence, scaleComparisons, checkLabel } from './explain.js';

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */

/**
 * @param {HTMLElement} root the #verdict section
 * @param {Result} r
 * @param {I18n} i18n
 */
export function renderVerdict(root, r, i18n) {
  const light = /** @type {HTMLElement} */ (root.querySelector('.verdict-light'));
  light.dataset.verdict = r.verdict;
  /** @type {HTMLElement} */ (light.querySelector('.verdict-title')).textContent = i18n.t(`verdict.title.${r.verdict}`);
  const eta = r.governing?.eta;
  /** @type {HTMLElement} */ (light.querySelector('.verdict-eta')).textContent = eta == null ? '—' : `η = ${i18n.num(eta, 2)}`;
  /** @type {HTMLElement} */ (light.querySelector('.verdict-check')).textContent = r.governing ? checkLabel(r.governing.id, i18n) : '';
  /** @type {HTMLElement} */ (root.querySelector('.verdict-sentence')).textContent = verdictSentence(r, i18n);
  const lever = /** @type {HTMLElement} */ (root.querySelector('.verdict-lever'));
  lever.textContent = r.governing && r.verdict !== 'green' ? i18n.t(r.governing.governingInput) : '';
  const ul = /** @type {HTMLElement} */ (root.querySelector('.scale'));
  ul.replaceChildren(...scaleComparisons(r, i18n).map((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    return li;
  }));
}
