// @ts-check
/** Design-space grid evaluation (spec §5.8). Cell index i = iy·nx + ix. */
import { evaluate } from './evaluate.js';

/** @typedef {import('./types.js').Inputs} Inputs */

const X = { key: 'turbine.hubHeight_m', min: 80, max: 180 };
const Y = {
  steel: { key: 'steel.segments.0.dBot_m', min: 3.5, max: 8.0 },
  hybrid: { key: 'hybrid.concrete.hTr_m', min: 20, max: 160 },
};
/** Minimum steel length above the transition (spec: h_tr from 20 m to H − 20 m). */
const MIN_STEEL_M = 20;

/**
 * @param {number} min
 * @param {number} max
 * @param {number} n
 */
function linspace(min, max, n) {
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? max : min + ((max - min) * i) / (n - 1)));
}

/**
 * Write the two axis values into an Inputs object in place.
 * @param {Inputs} inp
 * @param {'steel'|'hybrid'} kind
 * @param {number} x hub height
 * @param {number} y base diameter (steel) or transition height (hybrid)
 */
function setCell(inp, kind, x, y) {
  inp.type = kind;
  inp.turbine.hubHeight_m = x;
  if (kind === 'steel') inp.steel.segments[0].dBot_m = y;
  else inp.hybrid.concrete.hTr_m = y;
}

/**
 * @param {Inputs} inputs
 * @param {{ kind:'steel'|'hybrid', nx?:number, ny?:number }} opts
 */
export function sweep(inputs, { kind, nx = 40, ny = 40 }) {
  const xs = linspace(X.min, X.max, nx);
  const ya = Y[kind];
  const ys = linspace(ya.min, ya.max, ny);
  const eta = new Float64Array(nx * ny);
  /** @type {(string|null)[]} */
  const governing = new Array(nx * ny).fill(null);
  const valid = new Uint8Array(nx * ny);
  const work = structuredClone(inputs);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const i = iy * nx + ix;
      if (kind === 'hybrid' && ys[iy] > xs[ix] - MIN_STEEL_M) { eta[i] = NaN; continue; }
      setCell(work, kind, xs[ix], ys[iy]);
      const r = evaluate(work);
      if (!r.governing) { eta[i] = NaN; continue; }
      eta[i] = /** @type {number} */ (r.governing.eta);
      governing[i] = r.governing.id;
      valid[i] = 1;
    }
  }
  const current = {
    x: inputs.turbine.hubHeight_m,
    y: kind === 'steel' ? inputs.steel.segments[0].dBot_m : inputs.hybrid.concrete.hTr_m,
  };
  return { x: { key: X.key, values: xs }, y: { key: ya.key, values: ys }, eta, governing, valid, current, nx, ny, kind };
}

/**
 * New Inputs for one grid cell (used by the map click).
 * @param {Inputs} inputs
 * @param {'steel'|'hybrid'} kind
 * @param {number} ix
 * @param {number} iy
 * @param {number} [nx]
 * @param {number} [ny]
 * @returns {Inputs}
 */
export function applyCell(inputs, kind, ix, iy, nx = 40, ny = 40) {
  const out = structuredClone(inputs);
  setCell(out, kind, linspace(X.min, X.max, nx)[ix], linspace(Y[kind].min, Y[kind].max, ny)[iy]);
  return out;
}
