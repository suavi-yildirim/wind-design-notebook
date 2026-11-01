// @ts-check
/** Hand-made Inputs objects for unit tests (independent of the presets). */
import { DEFAULT_LIMITS, DEFAULT_ASSUMPTIONS } from '../src/calc/defaults.js';

/**
 * Uniform steel tower D=4 m, t=20 mm, H=100 m, near-rigid foundation, RNA 100 t.
 * @param {Partial<import('../src/calc/types.js').Inputs>} [over]
 * @returns {import('../src/calc/types.js').Inputs}
 */
export function uniformSteel(over = {}) {
  return structuredClone({
    presetId: 'test-uniform',
    type: 'steel',
    turbine: {
      ratedPower_W: 5e6, rotorDiameter_m: 126, hubHeight_m: 100, rpmMin: 6.9, rpmMax: 12.1,
      ratedWind_mps: 11.4, ctRated: 0.8, massNacelle_kg: 60000, massRotor_kg: 40000,
    },
    foundation: { kPhi_Nm_per_rad: 1e15 },
    steel: { segments: [{ lengthFrac: 1, dBot_m: 4, dTop_m: 4, tBot_m: 0.02, tTop_m: 0.02 }] },
    hybrid: {
      concrete: { hTr_m: 60, dBot_m: 9, dTop_m: 5, t_m: 0.35 },
      steel: { segments: [{ lengthFrac: 1, dBot_m: 4.3, dTop_m: 3.5, tBot_m: 0.03, tTop_m: 0.018 }] },
    },
    limits: { ...DEFAULT_LIMITS },
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    ...over,
  });
}

/** Hybrid variant of the uniform test tower with H=150 m and h_tr=60 m. */
export function hybridTest() {
  const i = uniformSteel();
  i.type = 'hybrid';
  i.turbine.hubHeight_m = 150;
  return i;
}
