// @ts-check
/** Design-space feasibility map (spec §5.8): cells coloured by governing check, η > 1 dark. */
import { svgRoot, scale, esc, r1 } from './svg.js';

/** @typedef {ReturnType<typeof import('../calc/sweep.js').sweep>} Sweep */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */

export const CHECK_COLORS = Object.freeze({
  freq: 'var(--c-freq)',
  stress: 'var(--c-stress)',
  'transport.d': 'var(--c-transport-d)',
  'transport.l': 'var(--c-transport-l)',
  'transport.m': 'var(--c-transport-m)',
  'concrete.m': 'var(--c-concrete-m)',
  crane: 'var(--c-crane)',
});

const W = 560;
const H = 420;
const M = { l: 58, r: 10, t: 10, b: 46 };

/**
 * @param {Sweep} s
 * @param {I18n} i18n
 * @returns {{ svg:string, legend:{ id:string, label:string, color:string, opacity:number }[], table:{ header:string[], rows:string[][] } }}
 */
export function feasibilityMapSvg(s, i18n) {
  const xs = s.x.values;
  const ys = s.y.values;
  const cw = (W - M.l - M.r) / s.nx;
  const ch = (H - M.t - M.b) / s.ny;
  const x = scale(xs[0], xs[xs.length - 1], M.l + cw / 2, W - M.r - cw / 2);
  const y = scale(ys[0], ys[ys.length - 1], H - M.b - ch / 2, M.t + ch / 2);
  const cells = [];
  for (let iy = 0; iy < s.ny; iy++) {
    for (let ix = 0; ix < s.nx; ix++) {
      const i = iy * s.nx + ix;
      const px = r1(M.l + ix * cw);
      const py = r1(H - M.b - (iy + 1) * ch);
      const g = s.governing[i];
      if (!s.valid[i] || !g) {
        cells.push(`<rect class="cell na" data-ix="${ix}" data-iy="${iy}" x="${px}" y="${py}" width="${r1(cw + 0.3)}" height="${r1(ch + 0.3)}" style="fill:var(--na);fill-opacity:0.5"/>`);
        continue;
      }
      const bad = s.eta[i] > 1;
      cells.push(`<rect class="cell${bad ? ' infeasible' : ''}" data-ix="${ix}" data-iy="${iy}" x="${px}" y="${py}" width="${r1(cw + 0.3)}" height="${r1(ch + 0.3)}" style="fill:${CHECK_COLORS[/** @type {keyof typeof CHECK_COLORS} */ (g)]};fill-opacity:${bad ? 1 : 0.38}"/>`);
    }
  }
  const axes = [];
  const yLabel = i18n.t(s.kind === 'steel' ? 'map.y.steel' : 'map.y.hybrid');
  for (let v = 80; v <= 180; v += 20) axes.push(`<text x="${r1(x(v))}" y="${H - M.b + 16}" text-anchor="middle">${esc(i18n.num(v, 0))}</text>`);
  const yStep = s.kind === 'steel' ? 0.5 : 20;
  for (let v = Math.ceil(ys[0] / yStep) * yStep; v <= ys[ys.length - 1] + 1e-9; v += yStep) {
    axes.push(`<text x="${M.l - 6}" y="${r1(y(v) + 4)}" text-anchor="end">${esc(i18n.num(v, s.kind === 'steel' ? 1 : 0))}</text>`);
  }
  axes.push(`<text x="${(M.l + W - M.r) / 2}" y="${H - 8}" text-anchor="middle" class="muted">${esc(i18n.t('map.x'))}</text>`);
  axes.push(`<text x="14" y="${(M.t + H - M.b) / 2}" text-anchor="middle" class="muted" transform="rotate(-90 14 ${(M.t + H - M.b) / 2})">${esc(yLabel)}</text>`);
  if (s.kind === 'steel') {
    axes.push(`<line class="limit" x1="${M.l}" x2="${W - M.r}" y1="${r1(y(4.3))}" y2="${r1(y(4.3))}" style="stroke:var(--ink);stroke-dasharray:5 4"/>`);
  }
  const cx = Math.min(Math.max(s.current.x, xs[0]), xs[xs.length - 1]);
  const cy = Math.min(Math.max(s.current.y, ys[0]), ys[ys.length - 1]);
  const marker = `<g class="current"><circle cx="${r1(x(cx))}" cy="${r1(y(cy))}" r="8" style="fill:none;stroke:var(--ink);stroke-width:3"/><circle cx="${r1(x(cx))}" cy="${r1(y(cy))}" r="8" style="fill:none;stroke:var(--surface);stroke-width:1.2"/><title>${esc(i18n.t('map.current'))}</title></g>`;
  const frame = `<rect x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" style="fill:none;stroke:var(--muted)"/>`;

  const present = new Set(s.governing.filter(Boolean));
  const legend = Object.entries(CHECK_COLORS).filter(([id]) => present.has(id))
    .map(([id, color]) => ({ id, label: i18n.t(`check.${id}.label`), color, opacity: 0.38 }));
  legend.push({ id: 'infeasible', label: i18n.t('map.infeasible'), color: 'var(--ink)', opacity: 1 });
  if ([...s.valid].some((v) => !v)) legend.push({ id: 'na', label: i18n.t('map.na'), color: 'var(--na)', opacity: 0.5 });

  // Coarse data-table fallback: every 4th cell in both directions.
  const step = 4;
  const header = [`${i18n.t('map.x')} \\ ${yLabel}`, ...ys.filter((_, i) => i % step === 0).map((v) => i18n.num(v, s.kind === 'steel' ? 2 : 0))];
  const rows = xs.map((xv, ix) => ix).filter((ix) => ix % step === 0).map((ix) => [i18n.num(xs[ix], 0),
    ...ys.map((_, iy) => iy).filter((iy) => iy % step === 0).map((iy) => {
      const i = iy * s.nx + ix;
      return s.governing[i] ? `${i18n.t(`check.${s.governing[i]}.label`)} ${i18n.num(s.eta[i], 2)}` : '—';
    })]);
  const feasible = s.governing.filter((g, i) => g && s.eta[i] <= 1).length;
  const label = `${i18n.t('map.title')}: ${feasible} / ${s.nx * s.ny} ${i18n.t('verdict.green')}`;
  return { svg: svgRoot(W, H, i18n.t('map.title'), label, cells.join('') + axes.join('') + frame + marker, 'map'), legend, table: { header, rows } };
}
