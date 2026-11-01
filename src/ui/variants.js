// @ts-check
/** Section ③: up to three saved variants side by side (spec §7.2 item 4). */
import { evaluate, inputsFromPreset } from '../calc/evaluate.js';
import { applyDiff, diffInputs } from './state.js';
import { esc } from '../charts/svg.js';
import { checkLabel } from './explain.js';

/** @typedef {import('./state.js').Variant} Variant */
/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('./app.js').App} App */

export const MAX_VARIANTS = 3;

/**
 * @param {Variant[]} list
 * @param {Variant} entry
 * @returns {{ list:Variant[], replaced:boolean }}
 */
export function addVariant(list, entry) {
  const next = [...list, entry];
  const replaced = next.length > MAX_VARIANTS;
  return { list: next.slice(-MAX_VARIANTS), replaced };
}

/**
 * @param {Variant[]} list
 * @param {number} i
 */
export function removeVariant(list, i) {
  return list.filter((_, k) => k !== i);
}

/**
 * Comparison rows; values are raw (SI or ids) for formatting by the caller.
 * @param {Result[]} results
 * @returns {{ key:string, values:(number|string|null)[] }[]}
 */
export function compareRows(results) {
  /** @param {(r:Result) => number|string|null|undefined} f */
  const row = (f) => results.map((r) => f(r) ?? null);
  return [
    { key: 'type', values: row((r) => r.inputs.type) },
    { key: 'hub', values: row((r) => r.inputs.turbine.hubHeight_m) },
    { key: 'total', values: row((r) => r.masses?.total_kg) },
    { key: 'steel', values: row((r) => r.masses?.steel_kg) },
    { key: 'concrete', values: row((r) => r.masses?.concrete_kg) },
    { key: 'segments', values: row((r) => r.segments?.steel.length) },
    { key: 'heaviest', values: row((r) => r.crane?.mass_kg) },
    { key: 'f1', values: row((r) => r.f1?.rayleigh_hz) },
    { key: 'etaMax', values: row((r) => r.governing?.eta) },
    { key: 'governing', values: row((r) => r.governing?.id) },
  ];
}

/** @param {App} app */
export function compareExtension(app) {
  const { ctx } = app;
  const i18n = ctx.i18n;
  const root = /** @type {HTMLElement} */ (document.querySelector('#compare-body'));
  root.innerHTML = `<div class="compare-actions"><button type="button" class="btn" id="save-variant">${esc(i18n.t('compare.save'))}</button><span class="map-meta" id="compare-msg" aria-live="polite"></span></div><div id="compare-table"></div>`;
  const msg = /** @type {HTMLElement} */ (root.querySelector('#compare-msg'));
  /** @param {Variant} v */
  const inputsOf = (v) => applyDiff(inputsFromPreset(ctx.presets[v.preset], v.type), v.diff).inputs;
  let counter = app.state.variants.length;

  /** @param {string} key @param {number|string|null} v */
  function fmt(key, v) {
    if (v === null) return '—';
    switch (key) {
      case 'type': return i18n.t(`type.${v}`);
      case 'hub': return i18n.unit(/** @type {number} */ (v), 'm', 0);
      case 'f1': return i18n.unit(/** @type {number} */ (v), 'Hz');
      case 'etaMax': return i18n.num(/** @type {number} */ (v), 2);
      case 'segments': return String(v);
      case 'governing': return checkLabel(String(v), i18n);
      default: return i18n.unit(/** @type {number} */ (v), 't', 0);
    }
  }

  function draw() {
    const box = /** @type {HTMLElement} */ (root.querySelector('#compare-table'));
    const vs = app.state.variants;
    if (!vs.length) { box.innerHTML = `<p class="section-lead">${esc(i18n.t('compare.empty'))}</p>`; return; }
    const results = vs.map((v) => evaluate(inputsOf(v)));
    const head = vs.map((v, i) => `<th scope="col">${esc(v.name)}<br><small>${esc(ctx.presets[v.preset].name[i18n.lang])}</small><br>`
      + `<button type="button" class="btn btn-ghost btn-small" data-load="${i}">${esc(i18n.t('compare.apply'))}</button> `
      + `<button type="button" class="btn btn-ghost btn-small" data-remove="${i}">${esc(i18n.t('compare.remove'))}</button></th>`).join('');
    const body = compareRows(results).map((r) => `<tr><th scope="row">${esc(i18n.t(`compare.row.${r.key}`))}</th>${r.values.map((x) => `<td class="num">${esc(fmt(r.key, x))}</td>`).join('')}</tr>`).join('');
    box.innerHTML = `<div class="table-scroll"><table class="compare-table"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  root.addEventListener('click', (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (t.id === 'save-variant') {
      counter += 1;
      const base = inputsFromPreset(ctx.presets[app.state.preset], app.state.type);
      const r = addVariant(app.state.variants, { name: i18n.t('compare.name', { n: counter }), preset: app.state.preset, type: app.state.type, diff: diffInputs(base, app.state.inputs) });
      app.setVariants(r.list);
      msg.textContent = r.replaced ? i18n.t('compare.replaced') : '';
      draw();
    } else if (t.dataset.remove) {
      app.setVariants(removeVariant(app.state.variants, Number(t.dataset.remove)));
      msg.textContent = '';
      draw();
    } else if (t.dataset.load) {
      const v = app.state.variants[Number(t.dataset.load)];
      app.loadVariant(v.preset, v.type, inputsOf(v));
    }
  });
  draw();
}
