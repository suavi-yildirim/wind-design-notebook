// @ts-check
/** Side view of the tower with segment joints coloured by η (spec §7.2). */
import { svgRoot, scale, esc, r1, verdictColor } from './svg.js';
import { verdict } from '../calc/checks.js';

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */

const W = 300;
const HPX = 460;
const EXAGGERATE = 4;

/**
 * Worst η of one steel segment: stress inside it and its own transport ratios.
 * @param {Result} r
 * @param {{ zBot:number, zTop:number, length_m:number, dMax_m:number, mass_kg:number }} s
 */
export function segmentEta(r, s) {
  const lim = r.inputs.limits;
  let eta = Math.max(s.dMax_m / lim.dTransport_m, s.length_m / lim.lMax_m, s.mass_kg / lim.mMax_kg);
  r.tower.stations.forEach((st, i) => {
    const e = r.stress?.eta[i];
    if (st.material === 'steel' && e != null && st.z >= s.zBot - 1e-9 && st.z <= s.zTop + 1e-9) eta = Math.max(eta, e);
  });
  return eta;
}

/**
 * @param {Result} r
 * @param {I18n} i18n
 */
export function towerSketchSvg(r, i18n) {
  const st = r.tower.stations;
  const t = r.inputs.turbine;
  const segs = r.segments?.steel ?? [];
  const R = t.rotorDiameter_m / 2;
  const H = r.tower.H;
  const top = 16;
  const bottom = 40;
  const y = scale(0, H + R, HPX - bottom, top);
  const sy = (HPX - bottom - top) / (H + R);
  const sx = sy * EXAGGERATE;
  const cx = 130;
  /** @param {'steel'|'concrete'} m */
  const outline = (m) => {
    const pts = st.filter((s) => s.material === m);
    if (pts.length < 2) return '';
    const left = pts.map((s) => `${r1(cx - (s.D * sx) / 2)},${r1(y(s.z))}`);
    const right = pts.slice().reverse().map((s) => `${r1(cx + (s.D * sx) / 2)},${r1(y(s.z))}`);
    return `<polygon class="${m}" points="${[...left, ...right].join(' ')}" style="fill:${m === 'steel' ? 'var(--steel)' : 'url(#hatch)'};stroke:var(--ink);stroke-width:0.8;fill-opacity:${m === 'steel' ? 0.55 : 1}"/>`;
  };
  const etas = segs.map((s) => segmentEta(r, s));
  const joints = segs.slice(1).map((s, i) => {
    const e = Math.max(etas[i], etas[i + 1]);
    const d = st.find((x) => x.material === 'steel' && x.z >= s.zBot - 1e-9)?.D ?? 4;
    const half = (d * sx) / 2 + 6;
    return `<line class="joint ${verdict(e)}" x1="${r1(cx - half)}" x2="${r1(cx + half)}" y1="${r1(y(s.zBot))}" y2="${r1(y(s.zBot))}" style="stroke:${verdictColor(verdict(e))};stroke-width:3"><title>${esc(`z = ${i18n.num(s.zBot, 1)} m, η = ${i18n.num(e, 2)}`)}</title></line>`;
  }).join('');
  const topD = st[st.length - 1]?.D ?? 3;
  const hubY = y(H);
  const nacelle = `<rect x="${r1(cx - 8)}" y="${r1(hubY - 7)}" width="26" height="12" rx="3" style="fill:var(--muted)"/>`;
  const rotor = `<line x1="${r1(cx + 22)}" x2="${r1(cx + 22)}" y1="${r1(y(H + R))}" y2="${r1(y(H - R))}" style="stroke:var(--muted);stroke-width:2.5;stroke-linecap:round"/><circle cx="${r1(cx + 22)}" cy="${r1(hubY)}" r="3" style="fill:var(--ink)"/>`;
  const baseD = st[0]?.D ?? 0;
  const dim = `<g class="dim"><line x1="34" x2="34" y1="${r1(y(0))}" y2="${r1(hubY)}" style="stroke:var(--muted)"/>`
    + `<text x="28" y="${r1((y(0) + hubY) / 2)}" text-anchor="middle" transform="rotate(-90 28 ${r1((y(0) + hubY) / 2)})">H = ${esc(i18n.num(H, 0))} m</text></g>`
    + `<line x1="10" x2="${W - 10}" y1="${r1(y(0))}" y2="${r1(y(0))}" style="stroke:var(--ink);stroke-width:1.5"/>`
    + `<text x="${cx}" y="${r1(y(0) + 18)}" text-anchor="middle">D = ${esc(i18n.num(baseD, 2))} m</text>`
    + `<text x="${r1(cx + (topD * sx) / 2 + 30)}" y="${r1(hubY + 4)}" class="muted">Ø ${esc(i18n.num(t.rotorDiameter_m, 0))} m</text>`;
  const legend = r.inputs.type === 'hybrid'
    ? `<text x="${W - 12}" y="${r1(y(r.inputs.hybrid.concrete.hTr_m) + 4)}" text-anchor="end" class="muted">${esc(i18n.num(r.inputs.hybrid.concrete.hTr_m, 0))} m</text>` : '';
  const defs = '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--concrete);fill-opacity:0.35"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--concrete);stroke-width:2"/></pattern></defs>';
  const label = i18n.t('chart.sketch.desc', { H: i18n.num(H, 0), d: i18n.num(baseD, 2), n: segs.length });
  return svgRoot(W, HPX, i18n.t('chart.sketch.title'), label,
    defs + outline('concrete') + outline('steel') + joints + nacelle + rotor + dim + legend, 'sketch-svg');
}
