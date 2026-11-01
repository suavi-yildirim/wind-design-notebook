// @ts-check
/**
 * Tower drawing (spec §7.2): a true-scale front view with rotor and blades, and a side view
 * with exaggerated width whose segment joints are coloured by η. Both share one height scale.
 */
import { svgRoot, scale, esc, r1, verdictColor } from './svg.js';
import { verdict } from '../calc/checks.js';

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */

const HPX = 560;
const TOP = 34;
const BOTTOM = 46;
const EXAGGERATE = 4;
/** Blade planform: radial position and half-chords (leading / trailing side) as fractions of R. */
const BLADE = [[0.03, 0.012, 0.012], [0.1, 0.02, 0.03], [0.22, 0.022, 0.042], [0.5, 0.016, 0.028], [0.8, 0.01, 0.016], [1, 0.003, 0.005]];

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
 * Tower outline polygons for one material, centred at cx, with horizontal scale sx.
 * @param {Result} r
 * @param {'steel'|'concrete'} m
 * @param {number} cx
 * @param {number} sx
 * @param {(z:number) => number} y
 */
function outline(r, m, cx, sx, y) {
  const pts = r.tower.stations.filter((s) => s.material === m);
  if (pts.length < 2) return '';
  const half = (/** @type {number} */ D) => Math.max(1, (D * sx) / 2);
  const left = pts.map((s) => `${r1(cx - half(s.D))},${r1(y(s.z))}`);
  const right = pts.slice().reverse().map((s) => `${r1(cx + half(s.D))},${r1(y(s.z))}`);
  const fill = m === 'steel' ? 'fill:var(--steel);fill-opacity:0.6' : 'fill:url(#hatch)';
  return `<polygon class="${m}" points="${[...left, ...right].join(' ')}" style="${fill};stroke:var(--ink);stroke-width:0.8"/>`;
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
  const sy = (HPX - TOP - BOTTOM) / (H + R);
  const y = scale(0, H + R, HPX - BOTTOM, TOP);
  const hubY = y(H);
  const baseD = st[0]?.D ?? 0;

  // ---- front view, true scale ----
  const dimX = 22;
  const cxF = dimX + 24 + R * sy;
  const frontW = cxF + R * sy + 16;
  const hubR = Math.max(3, 1.6 * sy);
  const blades = [-90, 30, 150].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    /** @param {number} u radial @param {number} v chordwise */
    const p = (u, v) => `${r1(cxF + (u * ca - v * sa) * R * sy)},${r1(hubY + (u * sa + v * ca) * R * sy)}`;
    const pts = [...BLADE.map(([u, le]) => p(u, -le)), ...BLADE.slice().reverse().map(([u, , te]) => p(u, te))];
    return `<polygon class="blade" points="${pts.join(' ')}" style="fill:var(--surface);stroke:var(--ink);stroke-width:1"/>`;
  }).join('');
  const nacW = Math.max(6, 4 * sy);
  const front = `<g class="view-front">`
    + `<circle class="rotor-disc" cx="${r1(cxF)}" cy="${r1(hubY)}" r="${r1(R * sy)}" style="fill:var(--accent);fill-opacity:0.05;stroke:var(--muted);stroke-dasharray:4 4"/>`
    + outline(r, 'concrete', cxF, sy, y) + outline(r, 'steel', cxF, sy, y)
    + `<rect x="${r1(cxF - nacW / 2)}" y="${r1(hubY - nacW / 2)}" width="${r1(nacW)}" height="${r1(nacW)}" rx="2" style="fill:var(--muted)"/>`
    + blades
    + `<circle class="hub" cx="${r1(cxF)}" cy="${r1(hubY)}" r="${r1(hubR)}" style="fill:var(--ink)"/>`
    + `<text x="${r1(cxF)}" y="${r1(hubY - R * sy - 6)}" text-anchor="middle" class="muted">Ø ${esc(i18n.num(t.rotorDiameter_m, 0))} m</text>`
    + `<text x="${r1(cxF)}" y="14" text-anchor="middle" style="font-weight:700">${esc(i18n.t('chart.sketch.front'))}</text>`
    + '</g>';

  // ---- side view, width exaggerated ----
  const sx = sy * EXAGGERATE;
  const maxD = Math.max(...st.map((s) => s.D), 1);
  const xS0 = frontW + 24;
  const cxS = xS0 + Math.max(40, (maxD * sx) / 2 + 12);
  const etas = segs.map((s) => segmentEta(r, s));
  const joints = segs.slice(1).map((s, i) => {
    const e = Math.max(etas[i], etas[i + 1]);
    const d = st.find((x) => x.material === 'steel' && x.z >= s.zBot - 1e-9)?.D ?? 4;
    const half = (d * sx) / 2 + 6;
    return `<line class="joint ${verdict(e)}" x1="${r1(cxS - half)}" x2="${r1(cxS + half)}" y1="${r1(y(s.zBot))}" y2="${r1(y(s.zBot))}" style="stroke:${verdictColor(verdict(e))};stroke-width:3"><title>${esc(`z = ${i18n.num(s.zBot, 1)} m, η = ${i18n.num(e, 2)}`)}</title></line>`;
  }).join('');
  const topD = st[st.length - 1]?.D ?? 3;
  const rotorX = cxS + (topD * sx) / 2 + 14;
  const side = `<g class="view-side">`
    + outline(r, 'concrete', cxS, sx, y) + outline(r, 'steel', cxS, sx, y) + joints
    + `<rect x="${r1(cxS - 10)}" y="${r1(hubY - 7)}" width="${r1(rotorX - cxS + 8)}" height="13" rx="3" style="fill:var(--muted)"/>`
    + `<line x1="${r1(rotorX)}" x2="${r1(rotorX)}" y1="${r1(y(H + R))}" y2="${r1(y(H - R))}" style="stroke:var(--ink);stroke-width:2.5;stroke-linecap:round"/>`
    + `<circle cx="${r1(rotorX)}" cy="${r1(hubY)}" r="3.5" style="fill:var(--ink)"/>`
    + `<text x="${r1(cxS)}" y="${r1(y(0) + 18)}" text-anchor="middle">D = ${esc(i18n.num(baseD, 2))} m</text>`
    + `<text x="${r1(cxS)}" y="14" text-anchor="middle" style="font-weight:700">${esc(i18n.t('chart.sketch.side'))}</text>`
    + `<text x="${r1(cxS)}" y="28" text-anchor="middle" class="muted">${esc(i18n.t('chart.sketch.exaggerated', { k: EXAGGERATE }))}</text>`
    + (r.inputs.type === 'hybrid'
      ? `<text x="${r1(cxS - (maxD * sx) / 2 - 6)}" y="${r1(y(r.inputs.hybrid.concrete.hTr_m) + 4)}" text-anchor="end" class="muted">${esc(i18n.num(r.inputs.hybrid.concrete.hTr_m, 0))} m</text>` : '')
    + '</g>';
  const W = Math.max(rotorX + 30, cxS + (maxD * sx) / 2 + 40);

  // ---- shared: ground, height dimension, hatch ----
  const groundY = y(0);
  const shared = `<line class="ground" x1="6" x2="${r1(W - 6)}" y1="${r1(groundY)}" y2="${r1(groundY)}" style="stroke:var(--ink);stroke-width:1.5"/>`
    + `<line x1="${dimX}" x2="${dimX}" y1="${r1(groundY)}" y2="${r1(hubY)}" style="stroke:var(--muted)"/>`
    + `<line x1="${dimX - 5}" x2="${dimX + 5}" y1="${r1(hubY)}" y2="${r1(hubY)}" style="stroke:var(--muted)"/>`
    + `<text x="${dimX - 6}" y="${r1((groundY + hubY) / 2)}" text-anchor="middle" transform="rotate(-90 ${dimX - 6} ${r1((groundY + hubY) / 2)})">H = ${esc(i18n.num(H, 0))} m</text>`;
  const defs = '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--concrete);fill-opacity:0.35"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--concrete);stroke-width:2"/></pattern></defs>';
  const label = i18n.t('chart.sketch.desc', { H: i18n.num(H, 0), d: i18n.num(baseD, 2), n: segs.length });
  return svgRoot(Math.ceil(W), HPX, i18n.t('chart.sketch.title'), label, defs + shared + front + side, 'sketch-svg');
}
