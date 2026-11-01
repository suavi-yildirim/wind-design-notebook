// @ts-check
/** Circular hollow section properties (spec §5.1), SI units. */

/**
 * @param {number} D outer diameter [m]
 * @param {number} t wall thickness [m]
 * @returns {{ A:number, I:number, W:number }} area [m²], second moment [m⁴], section modulus [m³]
 */
export function circularHollow(D, t) {
  const Di = D - 2 * t;
  const A = (Math.PI / 4) * (D ** 2 - Di ** 2);
  const I = (Math.PI / 64) * (D ** 4 - Di ** 4);
  return { A, I, W: (2 * I) / D };
}
