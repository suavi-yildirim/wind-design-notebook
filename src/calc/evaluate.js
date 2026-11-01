// @ts-check
/** One entry point: inputs → full result (spec §4). Pure, synchronous, never throws. */
import { DEFAULT_LIMITS, DEFAULT_ASSUMPTIONS } from './defaults.js';
import { buildStations, towerMasses } from './tower.js';
import { validateFoundation } from './foundation.js';
import { handFormula, rayleigh, bands, freqEta } from './frequency.js';
import { thrust, momentLine } from './loads.js';
import { balanceSteel, concreteRings } from './segments.js';
import { heaviestLift } from './crane.js';
import { stressCheck, dtPlausibility, makeCheck, pickGoverning, verdict } from './checks.js';

/** @typedef {import('./types.js').Inputs} Inputs */
/** @typedef {import('./types.js').Check} Check */
/** @typedef {import('./types.js').CalcError} CalcError */
/** @typedef {import('./types.js').Station} Station */

/**
 * @typedef {{
 *   inputs: Inputs,
 *   tower: { H:number, type:'steel'|'hybrid', stations:Station[] },
 *   f1: { rayleigh_hz:number, hand_hz:number, w:number[], formulaId:string, assumptionIds:string[] } | null,
 *   bands: ReturnType<typeof bands> | null,
 *   loads: (ReturnType<typeof momentLine> & { thrust_N:number, formulaId:string, assumptionIds:string[] }) | null,
 *   stress: ReturnType<typeof stressCheck> | null,
 *   dt: ReturnType<typeof dtPlausibility> | null,
 *   segments: { steel: ReturnType<typeof balanceSteel>, rings: ReturnType<typeof concreteRings> | null } | null,
 *   crane: ReturnType<typeof heaviestLift> | null,
 *   masses: { steel_kg:number, concrete_kg:number, rna_kg:number, total_kg:number } | null,
 *   checks: Check[], governing: Check|null, verdict: 'green'|'amber'|'red'|'none', errors: CalcError[]
 * }} Result
 */

const TURBINE_KEYS = /** @type {const} */ (['ratedPower_W', 'rotorDiameter_m', 'hubHeight_m', 'rpmMin', 'rpmMax',
  'ratedWind_mps', 'ctRated', 'massNacelle_kg', 'massRotor_kg']);

export const ASSUMPTIONS_BY_CHECK = Object.freeze({
  freq: ['asm.rayleighShape', 'asm.kPhi', 'asm.hubOffset', 'asm.uncracked', 'asm.kAdd', 'asm.rnaRotary'],
  stress: ['asm.loadIndicator', 'asm.windProfile', 'asm.loadFactors', 'asm.fyTable'],
  transport: ['asm.transportLimits'],
  concrete: ['asm.ringParts'],
  crane: ['asm.hookAllowance', 'asm.craneCapacity'],
});

/**
 * Build complete Inputs from a preset (spec §5.9) and a tower type.
 * @param {any} preset
 * @param {'steel'|'hybrid'} type
 * @returns {Inputs}
 */
export function inputsFromPreset(preset, type) {
  const p = structuredClone(preset);
  /** @type {any} */
  const turbine = {};
  for (const k of TURBINE_KEYS) turbine[k] = p.turbine[k];
  return {
    presetId: p.id,
    type,
    turbine,
    foundation: { kPhi_Nm_per_rad: p.foundation.kPhi_Nm_per_rad },
    steel: { segments: p.towers.steel.segments },
    hybrid: { concrete: p.towers.hybrid.concrete, steel: { segments: p.towers.hybrid.steel.segments } },
    limits: { ...DEFAULT_LIMITS, ...(p.limits ?? {}) },
    assumptions: { ...DEFAULT_ASSUMPTIONS, ...(p.assumptions ?? {}) },
  };
}

/**
 * Validate non-geometry inputs (geometry is validated by buildStations).
 * @param {Inputs} inputs
 * @returns {CalcError[]}
 */
export function validateInputs(inputs) {
  /** @type {CalcError[]} */
  const errors = [];
  const pos = (/** @type {string} */ path, /** @type {number} */ v) => {
    if (!(Number.isFinite(v) && v > 0)) errors.push({ id: 'input', field: path, key: 'error.input.nonPositive' });
  };
  for (const k of TURBINE_KEYS) if (k !== 'hubHeight_m') pos(`turbine.${k}`, inputs.turbine[k]);
  const { rpmMin, rpmMax } = inputs.turbine;
  if (rpmMin > 0 && rpmMax > 0 && rpmMin >= rpmMax) {
    errors.push({ id: 'freq', field: 'turbine.rpmMin', key: 'error.turbine.rpm' });
  }
  errors.push(...validateFoundation(inputs.foundation.kPhi_Nm_per_rad));
  for (const [k, v] of Object.entries(inputs.limits)) {
    if (k === 'freqMargin') {
      if (!(v >= 0 && v < 0.5)) errors.push({ id: 'input', field: 'limits.freqMargin', key: 'error.input.range' });
    } else if (k === 'ringParts') {
      if (!(Number.isInteger(v) && v >= 1)) errors.push({ id: 'input', field: 'limits.ringParts', key: 'error.input.integer' });
    } else pos(`limits.${k}`, v);
  }
  for (const [k, v] of Object.entries(inputs.assumptions)) {
    if (k === 'alpha' || k === 'cf') {
      if (!(Number.isFinite(v) && v >= 0)) errors.push({ id: 'input', field: `assumptions.${k}`, key: 'error.input.negative' });
    } else pos(`assumptions.${k}`, v);
  }
  return errors;
}

/**
 * @param {Inputs} inputs
 * @returns {Result}
 */
export function evaluate(inputs) {
  const errors = validateInputs(inputs);
  const geo = buildStations(inputs);
  errors.push(...geo.errors);
  /** @type {Result} */
  const result = {
    inputs, tower: { H: geo.H, type: inputs.type, stations: geo.stations },
    f1: null, bands: null, loads: null, stress: null, dt: null, segments: null, crane: null, masses: null,
    checks: [], governing: null, verdict: 'none', errors,
  };
  // An rpm error only blanks the frequency check; any other error blanks the whole result.
  if (errors.some((e) => e.key !== 'error.turbine.rpm') || geo.stations.length === 0) return result;

  const { turbine: tb, limits: lim, assumptions: asm } = inputs;
  const st = geo.stations;
  const H = geo.H;
  const mRna = tb.massNacelle_kg + tb.massRotor_kg;
  const kPhi = inputs.foundation.kPhi_Nm_per_rad;
  const tm = towerMasses(st);
  const EImean = st.reduce((s, x) => s + x.EI, 0) / st.length;
  const ray = rayleigh(st, { kPhi, mRna });
  result.f1 = {
    rayleigh_hz: ray.f1_hz, w: ray.w,
    hand_hz: handFormula({ H, EI: EImean, kPhi, mRna, mTower: tm.steel_kg + tm.concrete_kg }),
    formulaId: 'f1.rayleigh', assumptionIds: ASSUMPTIONS_BY_CHECK.freq,
  };

  /** @type {number|null} */
  let etaF = null;
  if (!errors.length) {
    result.bands = bands(tb.rpmMin, tb.rpmMax, lim.freqMargin);
    etaF = freqEta(ray.f1_hz, result.bands);
    if (etaF === null) {
      errors.push({ id: 'freq', key: 'error.freq.emptyWindow', params: {
        lo: tb.rpmMax / 60 * (1 + lim.freqMargin), hi: 3 * tb.rpmMin / 60 * (1 - lim.freqMargin) } });
    }
  }
  const w = result.bands?.window;
  const below = w ? ray.f1_hz < (w[0] + w[1]) / 2 : true;

  const F_T = thrust({ rhoAir: asm.rhoAir, rotorDiameter_m: tb.rotorDiameter_m, ctRated: tb.ctRated, ratedWind_mps: tb.ratedWind_mps });
  const ml = momentLine(st, { thrust_N: F_T, mRna_kg: mRna, ratedWind_mps: tb.ratedWind_mps, assumptions: asm });
  result.loads = { ...ml, thrust_N: F_T, formulaId: 'load.moment', assumptionIds: ASSUMPTIONS_BY_CHECK.stress };

  const zonePath = inputs.type === 'steel' ? 'steel.segments' : 'hybrid.steel.segments';
  const zones = inputs.type === 'steel' ? inputs.steel.segments : inputs.hybrid.steel.segments;
  const stress = stressCheck(st, ml, asm.gammaM1, zonePath, zones);
  errors.push(...stress.errors);
  result.stress = stress;
  result.dt = dtPlausibility(st);

  const steelSegs = balanceSteel(st, { lMax_m: lim.lMax_m, mMax_kg: lim.mMax_kg });
  const rings = inputs.type === 'hybrid'
    ? concreteRings(st, { hTr_m: inputs.hybrid.concrete.hTr_m, ringHeight_m: lim.ringHeight_m, ringParts: lim.ringParts })
    : null;
  result.segments = { steel: steelSegs, rings };
  const crane = heaviestLift({
    steelSegments: steelSegs, concreteMaxPart_kg: rings ? rings.maxPartMass_kg : 0,
    massNacelle_kg: tb.massNacelle_kg, massRotor_kg: tb.massRotor_kg, hubHeight_m: H, hookAllowance_m: asm.hookAllowance_m,
  });
  result.crane = crane;
  result.masses = { steel_kg: tm.steel_kg, concrete_kg: tm.concrete_kg, rna_kg: mRna, total_kg: tm.steel_kg + tm.concrete_kg + mRna };

  const dMax = Math.max(...steelSegs.map((s) => s.dMax_m));
  const lenMax = Math.max(...steelSegs.map((s) => s.length_m));
  const mMax = Math.max(...steelSegs.map((s) => s.mass_kg));
  const T = ASSUMPTIONS_BY_CHECK.transport;
  const checks = [
    makeCheck('freq', etaF, ray.f1_hz, w ? (below ? w[0] : w[1]) : NaN, 'Hz', 'check.freq', ASSUMPTIONS_BY_CHECK.freq,
      below ? 'lever.stiffer' : 'lever.softer'),
    makeCheck('stress', stress.etaMax, stress.sigma_Pa ?? NaN, stress.limit_Pa ?? NaN, 'Pa', 'check.stress',
      ASSUMPTIONS_BY_CHECK.stress, 'lever.wallThickness', stress.z_m ?? undefined),
    makeCheck('transport.d', dMax / lim.dTransport_m, dMax, lim.dTransport_m, 'm', 'check.transport', T, 'lever.baseDiameter'),
    makeCheck('transport.l', lenMax / lim.lMax_m, lenMax, lim.lMax_m, 'm', 'check.transport', T, 'lever.segmentLength'),
    makeCheck('transport.m', mMax / lim.mMax_kg, mMax, lim.mMax_kg, 'kg', 'check.transport', T, 'lever.segmentMass'),
  ];
  if (rings) {
    checks.push(makeCheck('concrete.m', rings.maxPartMass_kg / lim.mMax_kg, rings.maxPartMass_kg, lim.mMax_kg, 'kg',
      'check.concrete', ASSUMPTIONS_BY_CHECK.concrete, 'lever.ringParts'));
  }
  checks.push(makeCheck('crane', crane.mass_kg / lim.craneCapacity_kg, crane.mass_kg, lim.craneCapacity_kg, 'kg',
    'check.crane', ASSUMPTIONS_BY_CHECK.crane, 'lever.crane'));
  // Unknown limits (empty window, stress error) must not leak NaN into JSON consumers.
  for (const c of checks) {
    if (!Number.isFinite(c.limit)) c.limit = 0;
    if (!Number.isFinite(c.demand)) c.demand = 0;
  }
  result.checks = checks;
  result.governing = pickGoverning(checks);
  result.verdict = verdict(result.governing ? result.governing.eta : null);
  return result;
}
