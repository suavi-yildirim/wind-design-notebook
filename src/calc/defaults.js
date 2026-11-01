// @ts-check
/** Material constants and default limits/assumptions (spec §5). All SI. */

export const STEEL = Object.freeze({ E: 210e9, rho: 7850, fyName: 'S355' });
export const CONCRETE = Object.freeze({ E: 37e9, rho: 2500 });

/** Number of discretisation intervals along the tower. */
export const N_INTERVALS = 100;

/** @type {import('./types.js').Inputs['limits']} */
export const DEFAULT_LIMITS = Object.freeze({
  lMax_m: 30,
  mMax_kg: 80000,
  dTransport_m: 4.30,
  craneCapacity_kg: 120000,
  freqMargin: 0.10,
  ringHeight_m: 3.8,
  ringParts: 2,
});

/** @type {import('./types.js').Inputs['assumptions']} */
export const DEFAULT_ASSUMPTIONS = Object.freeze({
  kAdd: 1.08,
  rhoAir: 1.225,
  alpha: 0.2,
  cf: 0.7,
  gammaF: 1.35,
  kPeak: 1.5,
  gammaG: 1.35,
  gammaM1: 1.1,
  g: 9.81,
  hookAllowance_m: 10,
});
