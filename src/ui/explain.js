// @ts-check
/** Plain-language sentences from results (spec §7.2). Pure, no DOM. */

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */

const CATHEDRAL_M = 157;
const CAR_KG = 1500;

/**
 * @param {string} id check id
 * @param {I18n} i18n
 */
export function checkLabel(id, i18n) {
  return i18n.t(`check.${id}.label`);
}

/**
 * @param {Result} r
 * @param {I18n} i18n
 */
export function verdictSentence(r, i18n) {
  if (!r.governing || !r.f1) return i18n.t('verdict.noResult');
  const first = i18n.t('verdict.sentence', { f1: i18n.num(r.f1.rayleigh_hz, 2), verdict: i18n.t(`verdict.${r.verdict}`) });
  const gov = i18n.t('verdict.governing', { check: checkLabel(r.governing.id, i18n), eta: i18n.num(/** @type {number} */ (r.governing.eta), 2) });
  return [first, gov, ...assessmentNotes(r, i18n)].join(' ');
}

/**
 * Notes for checks that could not be assessed, and a resonance warning.
 * @param {Result} r
 * @param {I18n} i18n
 * @returns {string[]}
 */
export function assessmentNotes(r, i18n) {
  const out = [];
  if (r.notAssessed.length) out.push(i18n.t('verdict.notAssessed', { checks: r.notAssessed.map((id) => checkLabel(id, i18n)).join(', ') }));
  if (r.f1?.inBand) out.push(i18n.t('verdict.resonance', { band: r.f1.inBand }));
  return out;
}

/**
 * @param {'freq'|'stress'|'transport'|'crane'|'masses'|string} id
 * @param {Result} r
 * @param {I18n} i18n
 */
export function cardSentence(id, r, i18n) {
  if (!r.f1 || !r.masses || !r.crane || !r.segments) return i18n.t('verdict.noResult');
  switch (id) {
    case 'freq': {
      const f1 = i18n.num(r.f1.rayleigh_hz, 3);
      const w = r.bands?.window;
      if (!w) return [i18n.t('card.freq.sentence.empty', { f1 }), ...(r.f1.inBand ? [i18n.t('verdict.resonance', { band: r.f1.inBand })] : [])].join(' ');
      if (r.f1.rayleigh_hz < w[0]) return i18n.t('card.freq.sentence.low', { f1 });
      if (r.f1.rayleigh_hz > w[1]) return i18n.t('card.freq.sentence.high', { f1 });
      return i18n.t('card.freq.sentence.ok', { f1 });
    }
    case 'stress':
      if (r.stress?.etaMax == null || r.stress.z_m == null) return i18n.t('verdict.noResult');
      return i18n.t('card.stress.sentence', { z: i18n.num(r.stress.z_m, 0), eta: i18n.num(r.stress.etaMax, 2) });
    case 'transport': {
      const s = r.segments.steel;
      const lim = r.inputs.limits;
      let text = i18n.t('card.transport.sentence', {
        n: s.length, d: i18n.num(Math.max(...s.map((x) => x.dMax_m)), 2), lim: i18n.num(lim.dTransport_m, 2),
      });
      const rings = r.segments.rings;
      if (rings) text += ' ' + i18n.t('card.transport.rings', { n: rings.count, parts: lim.ringParts, m: i18n.num(rings.maxPartMass_kg / 1000, 1) });
      return text;
    }
    case 'crane':
      return i18n.t('card.crane.sentence', {
        what: i18n.t(`lift.${r.crane.source}`), m: i18n.num(r.crane.mass_kg / 1000, 0), h: i18n.num(r.crane.hookHeight_m, 0),
      });
    case 'masses':
      return i18n.t('card.masses.sentence', { t: i18n.num(r.masses.total_kg / 1000, 0), cars: i18n.num(Math.round(r.masses.total_kg / CAR_KG), 0) });
    default:
      return '';
  }
}

/**
 * Height vs. Cologne Cathedral, mass in cars, seconds per rotor turn.
 * @param {Result} r
 * @param {I18n} i18n
 * @returns {string[]}
 */
export function scaleComparisons(r, i18n) {
  const H = r.inputs.turbine.hubHeight_m;
  const out = [i18n.t('scale.height', { h: i18n.num(H, 0), ratio: i18n.num(H / CATHEDRAL_M, 2) })];
  if (r.masses) out.push(i18n.t('scale.mass', { t: i18n.num(r.masses.total_kg / 1000, 0), cars: i18n.num(Math.round(r.masses.total_kg / CAR_KG), 0) }));
  out.push(i18n.t('scale.rpm', { s: i18n.num(60 / r.inputs.turbine.rpmMax, 1) }));
  return out;
}
