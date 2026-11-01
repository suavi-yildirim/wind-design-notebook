// @ts-check
/** Load indicator – not a design load (spec §5.5). */

/** @typedef {import('./types.js').Station} Station */
/** @typedef {import('./types.js').Inputs['assumptions']} Assumptions */

/**
 * Rotor thrust at rated wind: F_T = ½·ρ_air·A_rotor·C_T·V_rated².
 * @param {{ rhoAir:number, rotorDiameter_m:number, ctRated:number, ratedWind_mps:number }} p
 * @returns {number} [N]
 */
export function thrust({ rhoAir, rotorDiameter_m, ctRated, ratedWind_mps }) {
  const A = Math.PI * (rotorDiameter_m / 2) ** 2;
  return 0.5 * rhoAir * A * ctRated * ratedWind_mps ** 2;
}

/**
 * Design moment M_d(z) = γ_F·k_peak·[F_T·(H−z) + ∫_z^H q(ζ)·(ζ−z) dζ] with tower drag
 * q(z) = ½·ρ_air·v(z)²·c_f·D(z), v(z) = V_rated·(z/H)^α, and normal force
 * N(z) = (M_RNA + tower mass above z)·g·γ_G. Integrals by trapezoid from the top.
 * @param {Station[]} stations
 * @param {{ thrust_N:number, mRna_kg:number, ratedWind_mps:number, assumptions:Assumptions }} p
 * @returns {{ z:number[], Md:number[], N:number[], baseMoment_Nm:number }}
 */
export function momentLine(stations, { thrust_N, mRna_kg, ratedWind_mps, assumptions: a }) {
  const n = stations.length;
  const H = stations[n - 1].z;
  const q = stations.map((s) => 0.5 * a.rhoAir * (ratedWind_mps * (s.z / H) ** a.alpha) ** 2 * a.cf * s.D);
  const Md = new Array(n).fill(0);
  const N = new Array(n).fill(0);
  // Q0 = ∫_z^H q dζ, Q1 = ∫_z^H q·ζ dζ, so ∫_z^H q·(ζ−z) dζ = Q1 − z·Q0.
  let Q0 = 0;
  let Q1 = 0;
  let mAbove = 0;
  N[n - 1] = mRna_kg * a.g * a.gammaG;
  for (let i = n - 2; i >= 0; i--) {
    const s0 = stations[i];
    const s1 = stations[i + 1];
    const dz = s1.z - s0.z;
    Q0 += ((q[i] + q[i + 1]) / 2) * dz;
    Q1 += ((q[i] * s0.z + q[i + 1] * s1.z) / 2) * dz;
    mAbove += ((s0.mu + s1.mu) / 2) * dz;
    Md[i] = a.gammaF * a.kPeak * (thrust_N * (H - s0.z) + Q1 - s0.z * Q0);
    N[i] = (mRna_kg + mAbove) * a.g * a.gammaG;
  }
  return { z: stations.map((s) => s.z), Md, N, baseMoment_Nm: Md[0] };
}
