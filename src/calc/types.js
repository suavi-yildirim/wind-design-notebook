// @ts-check
/**
 * Shared JSDoc types for the calculation core. This module has no runtime code.
 *
 * @typedef {{ lengthFrac:number, dBot_m:number, dTop_m:number, tBot_m:number, tTop_m:number }} SteelZone
 * @typedef {{ hTr_m:number, dBot_m:number, dTop_m:number, t_m:number }} Concrete
 * @typedef {{
 *   presetId:string, type:'steel'|'hybrid',
 *   turbine:{ ratedPower_W:number, rotorDiameter_m:number, hubHeight_m:number, rpmMin:number, rpmMax:number,
 *             ratedWind_mps:number, ctRated:number, massNacelle_kg:number, massRotor_kg:number },
 *   foundation:{ kPhi_Nm_per_rad:number },
 *   steel:{ segments:SteelZone[] },
 *   hybrid:{ concrete:Concrete, steel:{ segments:SteelZone[] } },
 *   limits:{ lMax_m:number, mMax_kg:number, dTransport_m:number, craneCapacity_kg:number,
 *            freqMargin:number, ringHeight_m:number, ringParts:number },
 *   assumptions:{ kAdd:number, rhoAir:number, alpha:number, cf:number, gammaF:number, kPeak:number,
 *                 gammaG:number, gammaM1:number, g:number, hookAllowance_m:number }
 * }} Inputs
 * @typedef {{ z:number, D:number, t:number, A:number, I:number, W:number, EI:number, mu:number,
 *             material:'steel'|'concrete', zone?:number }} Station
 * @typedef {{ id:string, eta:number|null, limit:number, demand:number, unit:string, formulaId:string,
 *             assumptionIds:string[], governingInput:string, z_m?:number }} Check
 * @typedef {{ id:string, field?:string, key:string, params?:Record<string,number|string> }} CalcError
 */
export {};
