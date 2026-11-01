// @ts-check
/** Utilisation η per check as horizontal bars, and the mass breakdown bar. */
import { svgRoot, scale, esc, r1, verdictColor } from './svg.js';
import { verdict } from '../calc/checks.js';

/** @typedef {import('../i18n/i18n.js').I18n} I18n */
/** @typedef {import('../calc/types.js').Check} Check */

/**
 * @param {Check[]} checks
 * @param {I18n} i18n
 * @param {string|null} [governingId]
 */
export function utilisationBarsSvg(checks, i18n, governingId) {
  const gov = governingId ?? checks.reduce((/** @type {Check|null} */ b, c) => (c.eta != null && (!b || c.eta > /** @type {number} */ (b.eta)) ? c : b), null)?.id;
  const W = 560;
  const row = 28;
  const L = 190;
  const H = checks.length * row + 30;
  const etaMax = Math.max(1.2, ...checks.map((c) => c.eta ?? 0)) * 1.05;
  const x = scale(0, etaMax, L, W - 60);
  const body = checks.map((c, i) => {
    const yy = 8 + i * row;
    const label = `<text x="${L - 8}" y="${yy + 15}" text-anchor="end">${esc(i18n.t(`check.${c.id}.label`))}</text>`;
    if (c.eta == null) return `${label}<text x="${L + 4}" y="${yy + 15}" class="muted">—</text>`;
    const v = verdict(c.eta);
    const cls = c.id === gov ? 'bar governing' : 'bar';
    return `${label}<rect class="${cls}" x="${L}" y="${yy + 3}" width="${r1(Math.max(1, x(c.eta) - L))}" height="${row - 10}" rx="3" style="fill:${verdictColor(v)};fill-opacity:${c.id === gov ? 1 : 0.6}${c.id === gov ? ';stroke:var(--ink);stroke-width:1.5' : ''}"/>`
      + `<text x="${r1(x(c.eta) + 6)}" y="${yy + 15}" style="font-family:var(--mono)${c.id === gov ? ';font-weight:700' : ''}">${esc(i18n.num(c.eta, 2))}</text>`;
  }).join('');
  const one = `<line class="eta-one" x1="${r1(x(1))}" x2="${r1(x(1))}" y1="4" y2="${H - 22}" style="stroke:var(--ink);stroke-dasharray:3 3"/><text x="${r1(x(1))}" y="${H - 8}" text-anchor="middle">η = 1</text>`;
  const label = checks.map((c) => `${i18n.t(`check.${c.id}.label`)} ${c.eta == null ? '—' : i18n.num(c.eta, 2)}`).join('; ');
  return svgRoot(W, H, i18n.t('chart.bars.title'), label, body + one, 'bars');
}

/**
 * @param {import('../calc/evaluate.js').Result} r
 * @param {I18n} i18n
 */
export function massBarsSvg(r, i18n) {
  const m = r.masses ?? { steel_kg: 0, concrete_kg: 0, rna_kg: 0, total_kg: 1 };
  const W = 520;
  const H = 70;
  const parts = /** @type {const} */ ([['steel', m.steel_kg, 'var(--steel)'], ['concrete', m.concrete_kg, 'var(--concrete)'], ['rna', m.rna_kg, 'var(--muted)']]);
  const x = scale(0, Math.max(1, m.total_kg), 8, W - 8);
  let acc = 0;
  const body = parts.filter((p) => p[1] > 0).map(([k, v, c]) => {
    const x0 = x(acc);
    acc += v;
    const w = x(acc) - x0;
    const text = w > 70 ? `<text x="${r1(x0 + w / 2)}" y="54" text-anchor="middle">${esc(i18n.t(`mass.${k}`))} ${esc(i18n.num(v / 1000, 0))} t</text>` : '';
    return `<rect x="${r1(x0)}" y="8" width="${r1(w)}" height="28" style="fill:${c}"><title>${esc(`${i18n.t(`mass.${k}`)}: ${i18n.num(v / 1000, 0)} t`)}</title></rect>${text}`;
  }).join('');
  const label = parts.map(([k, v]) => `${i18n.t(`mass.${k}`)} ${i18n.num(v / 1000, 0)} t`).join(', ');
  return svgRoot(W, H, i18n.t('chart.mass.title'), label, body, 'masses');
}
