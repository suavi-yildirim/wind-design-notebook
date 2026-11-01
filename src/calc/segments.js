// @ts-check
/** Steel transport segments and concrete ring parts (spec §5.6). */
import { massBetween } from './tower.js';

/** @typedef {import('./types.js').Station} Station */
/** @typedef {{ zBot:number, zTop:number, length_m:number, dMax_m:number, mass_kg:number }} SteelSegment */

const EPS = 1e-9;

/**
 * Greedy split of the steel part from top to bottom. A segment closes when adding the
 * next interval would exceed L_max or m_max (equality allowed). A single interval that
 * exceeds a limit on its own forms its own segment.
 * @param {Station[]} stations
 * @param {{ lMax_m:number, mMax_kg:number }} limits
 * @returns {SteelSegment[]} ordered bottom → top
 */
export function splitSteel(stations, { lMax_m, mMax_kg }) {
  const st = stations.filter((s) => s.material === 'steel');
  /** @type {SteelSegment[]} */
  const out = [];
  if (st.length < 2) return out;
  let top = st.length - 1;
  let len = 0;
  let mass = 0;
  let dMax = st[top].D;
  for (let i = st.length - 2; i >= 0; i--) {
    const dz = st[i + 1].z - st[i].z;
    const dm = ((st[i].mu + st[i + 1].mu) / 2) * dz;
    const fits = len + dz <= lMax_m * (1 + EPS) && mass + dm <= mMax_kg * (1 + EPS);
    if (!fits && len > 0) {
      out.push({ zBot: st[i + 1].z, zTop: st[top].z, length_m: len, dMax_m: dMax, mass_kg: mass });
      top = i + 1;
      len = 0;
      mass = 0;
      dMax = st[top].D;
    }
    len += dz;
    mass += dm;
    dMax = Math.max(dMax, st[i].D);
  }
  out.push({ zBot: st[0].z, zTop: st[top].z, length_m: len, dMax_m: dMax, mass_kg: mass });
  return out.reverse();
}

/**
 * Balanced split: the greedy split fixes the minimum number of segments n; the limits
 * are then scaled down (bisection) to the smallest factor that still yields n segments.
 * Without this, greedy segments are always filled to L_max or m_max and η_L, η_m ≈ 1.
 * @param {Station[]} stations
 * @param {{ lMax_m:number, mMax_kg:number }} limits
 * @returns {SteelSegment[]} ordered bottom → top
 */
export function balanceSteel(stations, { lMax_m, mMax_kg }) {
  const greedy = splitSteel(stations, { lMax_m, mMax_kg });
  const n = greedy.length;
  let lo = 0;
  let hi = 1;
  let best = greedy;
  for (let k = 0; k < 20; k++) {
    const s = (lo + hi) / 2;
    const trial = splitSteel(stations, { lMax_m: s * lMax_m, mMax_kg: s * mMax_kg });
    if (trial.length <= n) { hi = s; best = trial; } else lo = s;
  }
  return best;
}

/**
 * Concrete rings of height h_ring (last one shorter), each split into n_parts.
 * @param {Station[]} stations
 * @param {{ hTr_m:number, ringHeight_m:number, ringParts:number }} p
 */
export function concreteRings(stations, { hTr_m, ringHeight_m, ringParts }) {
  const count = Math.ceil(hTr_m / ringHeight_m - EPS);
  const rings = Array.from({ length: count }, (_, k) => {
    const zBot = k * ringHeight_m;
    const zTop = Math.min((k + 1) * ringHeight_m, hTr_m);
    return { zBot, zTop, mass_kg: massBetween(stations, zBot, zTop, 'concrete') };
  });
  const partMass_kg = rings.map((r) => r.mass_kg / ringParts);
  return { count, rings, partMass_kg, maxPartMass_kg: Math.max(0, ...partMass_kg) };
}
