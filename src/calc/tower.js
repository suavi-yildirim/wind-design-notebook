// @ts-check
/** Tower definition → discretised stations (spec §5.1). */
import { circularHollow } from './section.js';
import { STEEL, CONCRETE, N_INTERVALS } from './defaults.js';

/** @typedef {import('./types.js').Inputs} Inputs */
/** @typedef {import('./types.js').Station} Station */
/** @typedef {import('./types.js').SteelZone} SteelZone */
/** @typedef {import('./types.js').CalcError} CalcError */

/**
 * @param {number} z
 * @param {number} D
 * @param {number} t
 * @param {'steel'|'concrete'} material
 * @param {number} kAdd
 * @param {number} [zone] steel zone index
 * @returns {Station}
 */
function station(z, D, t, material, kAdd, zone) {
  const { A, I, W } = circularHollow(D, t);
  const mat = material === 'steel' ? STEEL : CONCRETE;
  const mu = mat.rho * A * (material === 'steel' ? kAdd : 1);
  return { z, D, t, A, I, W, EI: mat.E * I, mu, material, ...(zone === undefined ? {} : { zone }) };
}

/**
 * @param {SteelZone[]} zones
 * @param {string} path dotted path of the zone array, for error fields
 * @returns {CalcError[]}
 */
function validateZones(zones, path) {
  /** @type {CalcError[]} */
  const errors = [];
  if (!Array.isArray(zones) || zones.length === 0) {
    return [{ id: 'geometry', field: path, key: 'error.geom.noZones' }];
  }
  const sum = zones.reduce((s, z) => s + z.lengthFrac, 0);
  if (!(Math.abs(sum - 1) <= 1e-6)) {
    errors.push({ id: 'geometry', field: `${path}.0.lengthFrac`, key: 'error.geom.fracSum', params: { sum } });
  }
  zones.forEach((zone, i) => {
    for (const k of /** @type {const} */ (['lengthFrac', 'dBot_m', 'dTop_m', 'tBot_m', 'tTop_m'])) {
      if (!(Number.isFinite(zone[k]) && zone[k] > 0)) {
        errors.push({ id: 'geometry', field: `${path}.${i}.${k}`, key: 'error.geom.nonPositive' });
      }
    }
    if (zone.tBot_m >= zone.dBot_m / 2) errors.push({ id: 'geometry', field: `${path}.${i}.tBot_m`, key: 'error.geom.tTooLarge' });
    if (zone.tTop_m >= zone.dTop_m / 2) errors.push({ id: 'geometry', field: `${path}.${i}.tTop_m`, key: 'error.geom.tTooLarge' });
  });
  return errors;
}

/**
 * Diameter and wall thickness at relative position s ∈ [0, 1] along the zone list.
 * @param {SteelZone[]} zones
 * @param {number} s
 */
function zoneAt(zones, s) {
  let start = 0;
  for (let i = 0; i < zones.length; i++) {
    const end = start + zones[i].lengthFrac;
    if (s < end || i === zones.length - 1) {
      const u = Math.min(1, Math.max(0, (s - start) / zones[i].lengthFrac));
      const z = zones[i];
      return { D: z.dBot_m + (z.dTop_m - z.dBot_m) * u, t: z.tBot_m + (z.tTop_m - z.tBot_m) * u, zone: i };
    }
    start = end;
  }
  throw new Error('unreachable');
}

/**
 * Discretise the tower into stations ordered by z. Hybrid towers get a duplicated
 * station at z = h_tr (concrete, then steel) so integrals never mix materials.
 * @param {Inputs} inputs
 * @returns {{ H:number, stations:Station[], errors:CalcError[] }}
 */
export function buildStations(inputs) {
  const H = inputs.turbine.hubHeight_m;
  const kAdd = inputs.assumptions.kAdd;
  /** @type {CalcError[]} */
  const errors = [];
  if (!(Number.isFinite(H) && H > 0)) {
    errors.push({ id: 'geometry', field: 'turbine.hubHeight_m', key: 'error.geom.nonPositive' });
    return { H, stations: [], errors };
  }

  if (inputs.type === 'steel') {
    errors.push(...validateZones(inputs.steel.segments, 'steel.segments'));
    if (errors.length) return { H, stations: [], errors };
    const zones = inputs.steel.segments;
    /** @type {Station[]} */
    const stations = [];
    for (let i = 0; i <= N_INTERVALS; i++) {
      const z = (i / N_INTERVALS) * H;
      const { D, t, zone } = zoneAt(zones, i / N_INTERVALS);
      stations.push(station(z, D, t, 'steel', kAdd, zone));
    }
    return { H, stations, errors };
  }

  const c = inputs.hybrid.concrete;
  if (!(Number.isFinite(c.hTr_m) && c.hTr_m > 0 && c.hTr_m < H)) {
    errors.push({ id: 'geometry', field: 'hybrid.concrete.hTr_m', key: 'error.geom.hTrRange', params: { H } });
  }
  for (const k of /** @type {const} */ (['dBot_m', 'dTop_m', 't_m'])) {
    if (!(Number.isFinite(c[k]) && c[k] > 0)) errors.push({ id: 'geometry', field: `hybrid.concrete.${k}`, key: 'error.geom.nonPositive' });
  }
  if (c.t_m >= Math.min(c.dBot_m, c.dTop_m) / 2) errors.push({ id: 'geometry', field: 'hybrid.concrete.t_m', key: 'error.geom.tTooLarge' });
  errors.push(...validateZones(inputs.hybrid.steel.segments, 'hybrid.steel.segments'));
  if (errors.length) return { H, stations: [], errors };

  const nc = Math.min(N_INTERVALS - 2, Math.max(2, Math.round((N_INTERVALS * c.hTr_m) / H)));
  const ns = N_INTERVALS - nc;
  /** @type {Station[]} */
  const stations = [];
  for (let j = 0; j <= nc; j++) {
    const u = j / nc;
    stations.push(station(u * c.hTr_m, c.dBot_m + (c.dTop_m - c.dBot_m) * u, c.t_m, 'concrete', kAdd));
  }
  const zones = inputs.hybrid.steel.segments;
  for (let k = 0; k <= ns; k++) {
    const u = k / ns;
    const { D, t, zone } = zoneAt(zones, u);
    stations.push(station(c.hTr_m + u * (H - c.hTr_m), D, t, 'steel', kAdd, zone));
  }
  return { H, stations, errors };
}

/**
 * Mass between two heights, with μ linear inside each interval.
 * @param {Station[]} stations
 * @param {number} z0
 * @param {number} z1
 * @param {'steel'|'concrete'} [material] only count intervals of this material
 * @returns {number} [kg]
 */
export function massBetween(stations, z0, z1, material) {
  let m = 0;
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    if (b.z <= a.z || a.material !== b.material) continue;
    if (material && a.material !== material) continue;
    const lo = Math.max(a.z, z0);
    const hi = Math.min(b.z, z1);
    if (hi <= lo) continue;
    const muAt = (/** @type {number} */ z) => a.mu + ((b.mu - a.mu) * (z - a.z)) / (b.z - a.z);
    m += ((muAt(lo) + muAt(hi)) / 2) * (hi - lo);
  }
  return m;
}

/**
 * @param {Station[]} stations
 * @returns {{ steel_kg:number, concrete_kg:number }}
 */
export function towerMasses(stations) {
  if (stations.length === 0) return { steel_kg: 0, concrete_kg: 0 };
  const H = stations[stations.length - 1].z;
  return { steel_kg: massBetween(stations, 0, H, 'steel'), concrete_kg: massBetween(stations, 0, H, 'concrete') };
}
