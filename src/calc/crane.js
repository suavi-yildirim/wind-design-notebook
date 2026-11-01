// @ts-check
/** Heaviest lift and hook height (spec §5.6). No manufacturer load charts. */

/**
 * @param {{ steelSegments:{ mass_kg:number }[], concreteMaxPart_kg:number, massNacelle_kg:number,
 *           massRotor_kg:number, hubHeight_m:number, hookAllowance_m:number }} p
 * @returns {{ mass_kg:number, source:'steelSegment'|'concretePart'|'nacelle'|'rotor', hookHeight_m:number }}
 */
export function heaviestLift(p) {
  /** @type {[number, 'steelSegment'|'concretePart'|'nacelle'|'rotor'][]} */
  const candidates = [
    [p.massNacelle_kg, 'nacelle'],
    [p.massRotor_kg, 'rotor'],
    [Math.max(0, ...p.steelSegments.map((s) => s.mass_kg)), 'steelSegment'],
    [p.concreteMaxPart_kg, 'concretePart'],
  ];
  const [mass_kg, source] = candidates.reduce((best, c) => (c[0] > best[0] ? c : best));
  return { mass_kg, source, hookHeight_m: p.hubHeight_m + p.hookAllowance_m };
}
