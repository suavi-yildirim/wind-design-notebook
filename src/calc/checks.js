// @ts-check
/** Utilisation checks η (spec §4, §5.4–5.6). */

/** @typedef {import('./types.js').Check} Check */
/** @typedef {import('./types.js').Station} Station */
/** @typedef {import('./types.js').CalcError} CalcError */
/** @typedef {import('./types.js').Inputs} Inputs */

/**
 * Yield strength of S355 by wall thickness (EN 10025-2 steps used in spec §5.5).
 * @param {number} t_m
 * @returns {number|null} [Pa], null outside the table (t > 80 mm)
 */
export function fyS355(t_m) {
  const mm = t_m * 1000 - 1e-9;
  if (mm <= 16) return 355e6;
  if (mm <= 40) return 345e6;
  if (mm <= 63) return 335e6;
  if (mm <= 80) return 325e6;
  return null;
}

/**
 * @param {number|null} eta
 * @returns {'green'|'amber'|'red'|'none'}
 */
export function verdict(eta) {
  if (eta === null || !Number.isFinite(eta)) return 'none';
  if (eta <= 0.9) return 'green';
  if (eta <= 1.0) return 'amber';
  return 'red';
}

/**
 * @param {Check[]} checks
 * @returns {Check|null}
 */
export function pickGoverning(checks) {
  /** @type {Check|null} */
  let best = null;
  for (const c of checks) {
    if (c.eta === null) continue;
    if (!best || /** @type {number} */ (c.eta) > /** @type {number} */ (best.eta)) best = c;
  }
  return best;
}

/**
 * σ = N/A + M_d/W on steel stations, η_σ = σ / (f_y(t)/γ_M1).
 * @param {Station[]} stations
 * @param {{ Md:number[], N:number[] }} loads
 * @param {number} gammaM1
 * @param {string} zonePath dotted path of the steel zone array (for error fields)
 * @param {Inputs['steel']['segments']} zones
 * @returns {{ etaMax:number|null, z_m:number|null, sigma_Pa:number|null, limit_Pa:number|null, eta:(number|null)[], errors:CalcError[] }}
 */
export function stressCheck(stations, loads, gammaM1, zonePath, zones) {
  /** @type {CalcError[]} */
  const errors = [];
  /** @type {(number|null)[]} */
  const eta = [];
  let best = { etaMax: /** @type {number|null} */ (null), z_m: /** @type {number|null} */ (null), sigma_Pa: /** @type {number|null} */ (null), limit_Pa: /** @type {number|null} */ (null) };
  const reported = new Set();
  stations.forEach((s, i) => {
    if (s.material !== 'steel') { eta.push(null); return; }
    const fy = fyS355(s.t);
    if (fy === null) {
      eta.push(null);
      const zone = zones[s.zone ?? 0];
      const end = zone.tBot_m >= zone.tTop_m ? 'tBot_m' : 'tTop_m';
      const field = `${zonePath}.${s.zone ?? 0}.${end}`;
      if (!reported.has(field)) {
        reported.add(field);
        errors.push({ id: 'stress', field, key: 'error.stress.tOutsideTable', params: { t_mm: Math.round(s.t * 1000) } });
      }
      return;
    }
    const sigma = loads.N[i] / s.A + loads.Md[i] / s.W;
    const limit = fy / gammaM1;
    const e = sigma / limit;
    eta.push(e);
    if (best.etaMax === null || e > best.etaMax) best = { etaMax: e, z_m: s.z, sigma_Pa: sigma, limit_Pa: limit };
  });
  if (errors.length) return { etaMax: null, z_m: null, sigma_Pa: null, limit_Pa: null, eta, errors };
  return { ...best, eta, errors };
}

/**
 * D/t plausibility (not a check with η): hint when D/t > 300 or < 80.
 * @param {Station[]} stations
 * @returns {{ min:number, max:number, hint:'high'|'low'|null }}
 */
export function dtPlausibility(stations) {
  const r = stations.filter((s) => s.material === 'steel').map((s) => s.D / s.t);
  const min = Math.min(...r);
  const max = Math.max(...r);
  return { min, max, hint: max > 300 ? 'high' : min < 80 ? 'low' : null };
}

/**
 * @param {string} id
 * @param {number|null} eta
 * @param {number} demand
 * @param {number} limit
 * @param {string} unit
 * @param {string} formulaId
 * @param {string[]} assumptionIds
 * @param {string} governingInput i18n lever key: the input that relieves this check
 * @param {number} [z_m]
 * @returns {Check}
 */
export function makeCheck(id, eta, demand, limit, unit, formulaId, assumptionIds, governingInput, z_m) {
  return { id, eta, demand, limit, unit, formulaId, assumptionIds, governingInput, ...(z_m === undefined ? {} : { z_m }) };
}
