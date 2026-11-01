// @ts-check
/** CSV export of the utilisation table and the printable data sheet (spec §7.2 item 6). */
import { checkLabel } from './explain.js';

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('../i18n/i18n.js').I18n} I18n */
/** @typedef {import('./app.js').App} App */

/** Display factor and label per check unit. */
const CSV_UNITS = { Hz: [1, 'Hz', 4], Pa: [1e-6, 'MPa', 1], m: [1, 'm', 2], kg: [1e-3, 't', 1] };

/**
 * Utilisation table as CSV: UTF-8 BOM; German uses ";" and a decimal comma, English "," and a point.
 * @param {Result} r
 * @param {I18n} i18n
 */
export function utilisationCsv(r, i18n) {
  const de = i18n.lang === 'de';
  const sep = de ? ';' : ',';
  /** @param {number|null} v @param {number} d */
  const n = (v, d) => (v == null || !Number.isFinite(v) || v === 0 ? '' : de ? v.toFixed(d).replace('.', ',') : v.toFixed(d));
  /** @param {string} s */
  const cell = (s) => (s.includes(sep) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [['id', 'label', 'eta', 'demand', 'limit', 'unit', 'governing'].join(sep)];
  for (const c of r.checks) {
    const [f, unit, d] = CSV_UNITS[/** @type {keyof typeof CSV_UNITS} */ (c.unit)] ?? [1, c.unit, 3];
    lines.push([c.id, cell(checkLabel(c.id, i18n)), n(c.eta, 3), n(c.demand * /** @type {number} */ (f), /** @type {number} */ (d)),
      n(c.limit * /** @type {number} */ (f), /** @type {number} */ (d)), String(unit), c.id === r.governing?.id ? 'x' : ''].join(sep));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * @param {string} name
 * @param {string} text
 * @param {string} [type]
 */
export function downloadText(name, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** @param {App} app */
export function exportExtension(app) {
  const i18n = app.ctx.i18n;
  const head = document.createElement('div');
  head.id = 'print-head';
  document.querySelector('main')?.prepend(head);
  /** @type {HTMLDetailsElement[]} */
  let opened = [];

  /** @type {HTMLElement} */ (document.querySelector('#csv')).addEventListener('click', () => {
    if (!app.state.result) return;
    downloadText(`turm-${app.state.preset}-${app.state.type}-${i18n.lang}.csv`, utilisationCsv(app.state.result, i18n));
  });
  /** @type {HTMLElement} */ (document.querySelector('#print')).addEventListener('click', () => window.print());
  addEventListener('beforeprint', () => {
    const preset = app.ctx.presets[app.state.preset].name[i18n.lang];
    head.innerHTML = '';
    const h = document.createElement('h1');
    h.textContent = `${i18n.t('print.title')}: ${preset} · ${i18n.t(`type.${app.state.type}`)}`;
    const meta = document.createElement('p');
    meta.textContent = `${i18n.t('print.date', { date: new Date().toLocaleDateString(i18n.lang === 'de' ? 'de-DE' : 'en-GB') })} · ${i18n.t('print.link', { url: location.href })}`;
    head.append(h, meta);
    opened = [...document.querySelectorAll('details:not([open])')].map((d) => /** @type {HTMLDetailsElement} */ (d));
    for (const d of opened) d.open = true;
  });
  addEventListener('afterprint', () => {
    for (const d of opened) d.open = false;
    opened = [];
  });
}
