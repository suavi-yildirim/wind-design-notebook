// @ts-check
/** Input fields (number field + slider), parsing and validation marks (spec §7.2, §7.6). */
import { UNITS } from '../i18n/i18n.js';
import { getPath } from './state.js';

/** @typedef {import('../calc/types.js').Inputs} Inputs */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */
/** @typedef {keyof typeof UNITS} Unit */
/** @typedef {'turbine'|'geometry'|'foundation'|'limits'|'assumptions'} Group */
/** @typedef {{ path:string, group:Group, unit:Unit, min:number, max:number, step:number, labelKey:string, labelParams?:Record<string,number>, sub?:string }} Field */

/** [key, unit, min, max, step] in display units */
const TURBINE = /** @type {const} */ ([
  ['hubHeight_m', 'm', 60, 200, 1], ['ratedPower_W', 'MW', 1, 10, 0.05], ['rotorDiameter_m', 'm', 60, 250, 1],
  ['rpmMin', 'rpm', 1, 15, 0.1], ['rpmMax', 'rpm', 4, 20, 0.05], ['ratedWind_mps', 'm/s', 6, 15, 0.1],
  ['ctRated', '-', 0.3, 1, 0.01], ['massNacelle_kg', 't', 50, 800, 1], ['massRotor_kg', 't', 30, 400, 1],
]);
const ZONE = /** @type {const} */ ([
  ['lengthFrac', '-', 0.05, 1, 0.05], ['dBot_m', 'm', 2, 10, 0.05], ['dTop_m', 'm', 2, 10, 0.05],
  ['tBot_m', 'mm', 8, 100, 1], ['tTop_m', 'mm', 8, 100, 1],
]);
const CONCRETE = /** @type {const} */ ([
  ['hTr_m', 'm', 10, 170, 1], ['dBot_m', 'm', 4, 15, 0.1], ['dTop_m', 'm', 3, 10, 0.1], ['t_m', 'mm', 100, 800, 10],
]);
const LIMITS = /** @type {const} */ ([
  ['dTransport_m', 'm', 3, 6, 0.05], ['lMax_m', 'm', 10, 60, 1], ['mMax_kg', 't', 20, 200, 1],
  ['craneCapacity_kg', 't', 50, 1500, 10], ['freqMargin', 'pct', 0, 30, 1], ['ringHeight_m', 'm', 1, 6, 0.1], ['ringParts', '-', 1, 8, 1],
]);
const ASSUMPTIONS = /** @type {const} */ ([
  ['kAdd', '-', 1, 1.3, 0.01], ['rhoAir', '-', 1.1, 1.3, 0.005], ['alpha', '-', 0, 0.4, 0.01], ['cf', '-', 0.3, 1.2, 0.05],
  ['gammaF', '-', 1, 1.5, 0.05], ['kPeak', '-', 1, 2.5, 0.1], ['gammaG', '-', 1, 1.5, 0.05], ['gammaM1', '-', 1, 1.3, 0.05],
  ['hookAllowance_m', 'm', 0, 30, 1],
]);

/**
 * @param {number} si
 * @param {Unit} unit
 */
export function toDisplay(si, unit) {
  return Math.round(si * UNITS[unit].f * 1e9) / 1e9;
}

/**
 * @param {number} display
 * @param {Unit} unit
 */
export function toSI(display, unit) {
  return Math.round((display / UNITS[unit].f) * 1e12) / 1e12;
}

/**
 * Parse a user-typed number. German accepts "4,3" and "1.234,5"; a single dot without a comma
 * is read as a decimal point unless it groups exactly three digits ("1.234").
 * @param {string} str
 * @param {'de'|'en'} lang
 * @returns {number} NaN when invalid
 */
export function parseNumber(str, lang) {
  let s = String(str).replace(/[\s  ]/g, '');
  if (!s) return NaN;
  if (lang === 'de') {
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  } else {
    s = s.replace(/,/g, '');
  }
  if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

/**
 * All editable fields for the current inputs (zones depend on tower type and zone count).
 * @param {Inputs} inputs
 * @returns {Field[]}
 */
export function fieldsFor(inputs) {
  /** @type {Field[]} */
  const out = [];
  for (const [k, unit, min, max, step] of TURBINE) {
    out.push({ path: `turbine.${k}`, group: 'turbine', unit, min, max, step, labelKey: `field.turbine.${k}` });
  }
  if (inputs.type === 'hybrid') {
    for (const [k, unit, min, max, step] of CONCRETE) {
      out.push({ path: `hybrid.concrete.${k}`, group: 'geometry', unit, min, max, step, labelKey: `field.hybrid.concrete.${k}`, sub: 'concrete' });
    }
  }
  const prefix = inputs.type === 'steel' ? 'steel.segments' : 'hybrid.steel.segments';
  /** @type {import('../calc/types.js').SteelZone[]} */
  const zones = getPath(inputs, prefix);
  zones.forEach((_, i) => {
    for (const [k, unit, min, max, step] of ZONE) {
      out.push({ path: `${prefix}.${i}.${k}`, group: 'geometry', unit, min, max, step, labelKey: `field.zone.${k}`, sub: `zone${i}`, labelParams: { n: i + 1 } });
    }
  });
  out.push({ path: 'foundation.kPhi_Nm_per_rad', group: 'foundation', unit: 'GNm_rad', min: 10, max: 500, step: 5, labelKey: 'field.foundation.kPhi_Nm_per_rad' });
  for (const [k, unit, min, max, step] of LIMITS) {
    if ((k === 'ringHeight_m' || k === 'ringParts') && inputs.type !== 'hybrid') continue;
    out.push({ path: `limits.${k}`, group: 'limits', unit, min, max, step, labelKey: `field.limits.${k}` });
  }
  for (const [k, unit, min, max, step] of ASSUMPTIONS) {
    out.push({ path: `assumptions.${k}`, group: 'assumptions', unit, min, max, step, labelKey: `field.assumptions.${k}` });
  }
  return out;
}

/** @param {number} step */
const decimals = (step) => (String(step).split('.')[1] ?? '').length;

/**
 * @param {number} si
 * @param {Field} f
 * @param {I18n} i18n
 */
function fmt(si, f, i18n) {
  return i18n.num(toDisplay(si, f.unit), decimals(f.step)).replace(/[  ]/g, ' ');
}

/**
 * Build all input groups. `onChange(path, si)` fires for valid edits only.
 * @param {HTMLElement} root
 * @param {Inputs} inputs
 * @param {I18n} i18n
 * @param {(path:string, si:number) => void} onChange
 */
export function renderInputs(root, inputs, i18n, onChange) {
  root.replaceChildren();
  const fields = fieldsFor(inputs);
  /** @type {Record<string, HTMLElement>} */
  const groups = {};
  /** @type {Record<string, HTMLElement>} */
  const subs = {};
  for (const g of /** @type {Group[]} */ (['turbine', 'geometry', 'foundation', 'limits', 'assumptions'])) {
    const collapsible = g === 'limits' || g === 'assumptions';
    const box = document.createElement(collapsible ? 'details' : 'fieldset');
    box.className = `input-group input-group-${g}`;
    const head = document.createElement(collapsible ? 'summary' : 'legend');
    head.textContent = i18n.t(`group.${g}`);
    box.append(head);
    if (g === 'geometry') {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = i18n.t('inputs.zoneHint');
      box.append(hint);
    }
    root.append(box);
    groups[g] = box;
  }
  for (const f of fields) {
    let parent = groups[f.group];
    if (f.sub) {
      if (!subs[f.sub]) {
        const sub = document.createElement('div');
        sub.className = 'input-sub';
        const h = document.createElement('h4');
        h.textContent = f.sub === 'concrete' ? i18n.t('group.concrete') : i18n.t('group.steelZone', f.labelParams ?? {});
        sub.append(h);
        parent.append(sub);
        subs[f.sub] = sub;
      }
      parent = subs[f.sub];
    }
    parent.append(fieldRow(f, getPath(inputs, f.path), i18n, onChange));
  }
}

/**
 * @param {Field} f
 * @param {number} si
 * @param {I18n} i18n
 * @param {(path:string, si:number) => void} onChange
 */
function fieldRow(f, si, i18n, onChange) {
  const id = `f-${f.path.replace(/\./g, '-')}`;
  const row = document.createElement('div');
  row.className = 'field';
  row.dataset.path = f.path;
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = i18n.t(f.labelKey, f.labelParams);
  const text = document.createElement('input');
  Object.assign(text, { id, type: 'text', inputMode: 'decimal', autocomplete: 'off', spellcheck: false });
  text.dataset.path = f.path;
  text.value = fmt(si, f, i18n);
  const unit = document.createElement('span');
  unit.className = 'unit';
  unit.textContent = UNITS[f.unit].label;
  const range = document.createElement('input');
  Object.assign(range, { type: 'range', min: String(f.min), max: String(f.max), step: String(f.step), tabIndex: -1 });
  range.setAttribute('aria-hidden', 'true');
  range.value = String(toDisplay(si, f.unit));
  const err = document.createElement('p');
  err.className = 'field-error';
  err.id = `${id}-err`;
  text.setAttribute('aria-describedby', err.id);

  text.addEventListener('input', () => {
    const v = parseNumber(text.value, i18n.lang === 'de' ? 'de' : 'en');
    if (!Number.isFinite(v)) { setFieldError(row, i18n.t('field.invalid')); return; }
    setFieldError(row, '');
    range.value = String(v);
    onChange(f.path, toSI(v, f.unit));
  });
  text.addEventListener('change', () => {
    const v = parseNumber(text.value, i18n.lang === 'de' ? 'de' : 'en');
    if (Number.isFinite(v)) text.value = fmt(toSI(v, f.unit), f, i18n);
  });
  range.addEventListener('input', () => {
    const v = Number(range.value);
    text.value = fmt(toSI(v, f.unit), f, i18n);
    setFieldError(row, '');
    onChange(f.path, toSI(v, f.unit));
  });
  const ctl = document.createElement('div');
  ctl.className = 'field-control';
  ctl.append(text, unit);
  row.append(label, ctl, range, err);
  return row;
}

/**
 * @param {HTMLElement} row
 * @param {string} msg
 */
function setFieldError(row, msg) {
  const input = /** @type {HTMLInputElement} */ (row.querySelector('input[type=text]'));
  const err = /** @type {HTMLElement} */ (row.querySelector('.field-error'));
  err.textContent = msg;
  if (msg) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  row.classList.toggle('invalid', !!msg);
}

/**
 * Update displayed values after an external change (map click, variant load) without rebuilding.
 * @param {HTMLElement} root
 * @param {Inputs} inputs
 * @param {I18n} i18n
 */
export function syncInputs(root, inputs, i18n) {
  for (const f of fieldsFor(inputs)) {
    const row = /** @type {HTMLElement|null} */ (root.querySelector(`.field[data-path="${f.path}"]`));
    if (!row) continue;
    const text = /** @type {HTMLInputElement} */ (row.querySelector('input[type=text]'));
    const range = /** @type {HTMLInputElement} */ (row.querySelector('input[type=range]'));
    const si = getPath(inputs, f.path);
    if (document.activeElement !== text) text.value = fmt(si, f, i18n);
    range.value = String(toDisplay(si, f.unit));
  }
}

/**
 * Mark fields named in calculation errors.
 * @param {HTMLElement} root
 * @param {import('../calc/types.js').CalcError[]} errors
 * @param {I18n} i18n
 */
export function markErrors(root, errors, i18n) {
  for (const row of root.querySelectorAll('.field.calc-invalid')) {
    row.classList.remove('calc-invalid');
    setFieldError(/** @type {HTMLElement} */ (row), '');
  }
  for (const e of errors) {
    if (!e.field) continue;
    const row = /** @type {HTMLElement|null} */ (root.querySelector(`.field[data-path="${e.field}"]`));
    if (!row) continue;
    row.classList.add('calc-invalid');
    setFieldError(row, i18n.t(e.key, fmtParams(e.params, i18n)));
  }
}

/**
 * @param {Record<string, number|string>|undefined} params
 * @param {I18n} i18n
 */
export function fmtParams(params, i18n) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const [k, v] of Object.entries(params ?? {})) out[k] = typeof v === 'number' ? i18n.num(v, k === 'H' || k === 't_mm' ? 0 : 3) : v;
  return out;
}
