// @ts-check
/** First natural frequency and rotor excitation bands (spec §5.3, §5.4). */

/** @typedef {import('./types.js').Station} Station */

/**
 * Hand formula for a uniform tower, shown for intuition:
 * 1/k = H³/(3EI) + H²/k_φ, f₁ = 1/(2π)·√(k / (M_RNA + 0.24·m_tower)).
 * @param {{ H:number, EI:number, kPhi:number, mRna:number, mTower:number }} p EI = mean station EI
 * @returns {number} [Hz]
 */
export function handFormula({ H, EI, kPhi, mRna, mTower }) {
  const k = 1 / (H ** 3 / (3 * EI) + H ** 2 / kPhi);
  return Math.sqrt(k / (mRna + 0.24 * mTower)) / (2 * Math.PI);
}

/**
 * Rayleigh quotient with the static deflection line under a unit tip load.
 * Curvature F·(H−z)/EI(z) is integrated twice with the trapezoidal rule, plus the
 * rigid rotation θ₀ = F·H/k_φ. The strain-energy term uses ∫M²/EI dz = ∫EI·w''² dz.
 * @param {Station[]} stations
 * @param {{ kPhi:number, mRna:number }} p
 * @returns {{ f1_hz:number, w:number[] }} w = deflection line [m/N]
 */
export function rayleigh(stations, { kPhi, mRna }) {
  const n = stations.length;
  const H = stations[n - 1].z;
  const F = 1;
  const theta0 = (F * H) / kPhi;
  const kappa = stations.map((s) => (F * (H - s.z)) / s.EI);
  const w = new Array(n).fill(0);
  let theta = theta0;
  let strain = kPhi * theta0 ** 2;
  let kinetic = 0;
  for (let i = 1; i < n; i++) {
    const dz = stations[i].z - stations[i - 1].z;
    const thetaNext = theta + ((kappa[i - 1] + kappa[i]) / 2) * dz;
    w[i] = w[i - 1] + ((theta + thetaNext) / 2) * dz;
    theta = thetaNext;
    const m0 = F * (H - stations[i - 1].z);
    const m1 = F * (H - stations[i].z);
    strain += ((m0 ** 2 / stations[i - 1].EI + m1 ** 2 / stations[i].EI) / 2) * dz;
    kinetic += ((stations[i - 1].mu * w[i - 1] ** 2 + stations[i].mu * w[i] ** 2) / 2) * dz;
  }
  kinetic += mRna * w[n - 1] ** 2;
  return { f1_hz: Math.sqrt(strain / kinetic) / (2 * Math.PI), w };
}

/**
 * 1P/3P bands and the soft-stiff window [1P_max·(1+m), 3P_min·(1−m)].
 * @param {number} rpmMin
 * @param {number} rpmMax
 * @param {number} margin
 * @returns {{ p1:[number,number], p3:[number,number], window:[number,number]|null }}
 */
export function bands(rpmMin, rpmMax, margin) {
  /** @type {[number,number]} */
  const p1 = [rpmMin / 60, rpmMax / 60];
  /** @type {[number,number]} */
  const p3 = [3 * p1[0], 3 * p1[1]];
  const lo = p1[1] * (1 + margin);
  const hi = p3[0] * (1 - margin);
  return { p1, p3, window: lo < hi ? [lo, hi] : null };
}

/**
 * η_f = max(1P_max·(1+m)/f₁, f₁/(3P_min·(1−m))); null when the window is empty.
 * @param {number} f1
 * @param {{ window:[number,number]|null }} b
 * @returns {number|null}
 */
export function freqEta(f1, b) {
  if (!b.window) return null;
  return Math.max(b.window[0] / f1, f1 / b.window[1]);
}
