// @ts-check
/** Foundation as a rotational spring k_φ at the tower base (spec §5.2). */

/**
 * @param {number} kPhi rotational stiffness [N·m/rad]
 * @returns {import('./types.js').CalcError[]}
 */
export function validateFoundation(kPhi) {
  if (Number.isFinite(kPhi) && kPhi > 0) return [];
  return [{ id: 'foundation', field: 'foundation.kPhi_Nm_per_rad', key: 'error.foundation.kPhi' }];
}

/**
 * Rigid-body rotation of the tower base under a base moment.
 * @param {number} M_Nm base moment [N·m]
 * @param {number} kPhi [N·m/rad]
 * @returns {number} rotation [rad]
 */
export function baseRotation(M_Nm, kPhi) {
  return M_Nm / kPhi;
}
