// @ts-check
/** Campbell diagram: rotor speed vs. frequency with 1P/3P, operating range, margins and f₁ (spec §5.4). */
import { svgRoot, scale, ticks, esc, r1 } from './svg.js';

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */

const W = 520;
const H = 300;
const M = { l: 48, r: 16, t: 14, b: 40 };

/**
 * @param {Result} r
 * @param {I18n} i18n
 */
export function campbellSvg(r, i18n) {
  const { rpmMin, rpmMax } = r.inputs.turbine;
  const f1 = r.f1?.rayleigh_hz ?? 0;
  const xmax = rpmMax * 1.25;
  const ymax = Math.max((3 * rpmMax * 1.1) / 60, f1 * 1.3);
  const x = scale(0, xmax, M.l, W - M.r);
  const y = scale(0, ymax, H - M.b, M.t);
  const parts = [`<defs><clipPath id="cb-clip"><rect x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}"/></clipPath></defs>`];
  for (const v of ticks(xmax, 6)) {
    parts.push(`<line class="gridline" x1="${r1(x(v))}" x2="${r1(x(v))}" y1="${M.t}" y2="${H - M.b}"/><text x="${r1(x(v))}" y="${H - M.b + 14}" text-anchor="middle">${esc(i18n.num(v, 0))}</text>`);
  }
  for (const v of ticks(ymax, 5)) {
    parts.push(`<line class="gridline" x1="${M.l}" x2="${W - M.r}" y1="${r1(y(v))}" y2="${r1(y(v))}"/><text x="${M.l - 6}" y="${r1(y(v) + 4)}" text-anchor="end">${esc(i18n.num(v, 2))}</text>`);
  }
  parts.push(`<text x="${(M.l + W - M.r) / 2}" y="${H - 6}" text-anchor="middle" class="muted">${esc(i18n.t('chart.campbell.x'))}</text>`);
  parts.push(`<text x="12" y="${(M.t + H - M.b) / 2}" text-anchor="middle" class="muted" transform="rotate(-90 12 ${(M.t + H - M.b) / 2})">${esc(i18n.t('chart.campbell.y'))}</text>`);
  const g = [];
  g.push(`<rect class="operating" x="${r1(x(rpmMin))}" y="${M.t}" width="${r1(x(rpmMax) - x(rpmMin))}" height="${H - M.t - M.b}" style="fill:var(--accent);fill-opacity:0.08"><title>${esc(i18n.t('chart.campbell.operating'))}</title></rect>`);
  const w = r.bands?.window;
  if (w) {
    g.push(`<rect class="window" x="${M.l}" y="${r1(y(w[1]))}" width="${W - M.l - M.r}" height="${r1(y(w[0]) - y(w[1]))}" style="fill:var(--ok);fill-opacity:0.13"><title>${esc(i18n.t('value.window'))}</title></rect>`);
  }
  if (r.bands) {
    for (const v of [r.bands.p1[1] * (1 + r.inputs.limits.freqMargin), r.bands.p3[0] * (1 - r.inputs.limits.freqMargin)]) {
      g.push(`<line class="margin" x1="${M.l}" x2="${W - M.r}" y1="${r1(y(v))}" y2="${r1(y(v))}" style="stroke:var(--muted);stroke-dasharray:4 4"/>`);
    }
  }
  for (const [k, n] of /** @type {const} */ ([['1P', 1], ['3P', 3]])) {
    g.push(`<line x1="${x(0)}" y1="${y(0)}" x2="${r1(x(xmax))}" y2="${r1(y((n * xmax) / 60))}" style="stroke:var(--muted);stroke-width:1"/>`);
    g.push(`<line class="band-${k}" x1="${r1(x(rpmMin))}" y1="${r1(y((n * rpmMin) / 60))}" x2="${r1(x(rpmMax))}" y2="${r1(y((n * rpmMax) / 60))}" style="stroke:var(--c-stress);stroke-width:4;stroke-linecap:round"/>`);
    const lx = Math.min(xmax, (ymax * 60) / n) * 0.96;
    g.push(`<text x="${r1(x(lx))}" y="${r1(y((n * lx) / 60) - 6)}" text-anchor="end" style="font-weight:700">${k}</text>`);
  }
  if (f1 > 0) {
    g.push(`<line class="f1" data-f1="${f1.toFixed(4)}" x1="${M.l}" x2="${W - M.r}" y1="${r1(y(f1))}" y2="${r1(y(f1))}" style="stroke:var(--accent);stroke-width:2.5"/>`);
    g.push(`<text x="${W - M.r - 4}" y="${r1(y(f1) - 6)}" text-anchor="end" style="fill:var(--accent);font-weight:700">f₁ = ${esc(i18n.num(f1, 3))} Hz</text>`);
  }
  parts.push(`<g clip-path="url(#cb-clip)">${g.join('')}</g>`);
  parts.push(`<rect x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" style="fill:none;stroke:var(--muted)"/>`);
  const label = `${i18n.t('chart.campbell.title')}: f₁ = ${i18n.num(f1, 3)} Hz` + (w ? `, ${i18n.t('value.window')} ${i18n.num(w[0], 3)}–${i18n.num(w[1], 3)} Hz` : '');
  return svgRoot(W, H, i18n.t('chart.campbell.title'), label, parts.join(''), 'campbell');
}
