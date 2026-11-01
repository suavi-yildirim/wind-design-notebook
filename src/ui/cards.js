// @ts-check
/** Section ①: tower sketch, result cards with derivations, utilisation table (spec §7.2). */
import { verdict } from '../calc/checks.js';
import { towerSketchSvg } from '../charts/tower-sketch.js';
import { campbellSvg } from '../charts/campbell.js';
import { utilisationBarsSvg, massBarsSvg } from '../charts/utilisation-bars.js';
import { dataTable, esc } from '../charts/svg.js';
import { cardSentence, checkLabel } from './explain.js';
import { markdown } from './page-common.js';
import { fmtParams } from './inputs.js';
import { tex } from './katex.js';

/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('./app.js').App} App */
/** @typedef {import('../calc/types.js').Check} Check */

const CARDS = /** @type {const} */ (['freq', 'stress', 'transport', 'crane', 'masses']);
/** Turbine fields whose sources each card cites. */
const SOURCE_FIELDS = {
  freq: ['rpmMin', 'rpmMax', 'massNacelle_kg', 'massRotor_kg'],
  stress: ['rotorDiameter_m', 'ctRated', 'ratedWind_mps'],
  transport: [],
  crane: ['massNacelle_kg', 'massRotor_kg'],
  masses: ['massNacelle_kg', 'massRotor_kg'],
};
const FORMULAS = {
  freq: ['f1.rayleigh', 'f1.hand', 'bands.window', 'check.freq'],
  stress: ['load.thrust', 'load.drag', 'load.moment', 'load.normal', 'check.stress'],
  transport: ['check.transport', 'check.concrete'],
  crane: ['check.crane'],
  masses: ['section.A', 'section.I', 'section.W'],
};

/**
 * @param {number} v SI value
 * @param {string} unit check unit
 * @param {import('../i18n/i18n.js').I18n} i18n
 */
export function fmtCheckValue(v, unit, i18n) {
  if (!Number.isFinite(v) || v === 0) return '—';
  return { Hz: () => i18n.unit(v, 'Hz'), Pa: () => i18n.unit(v, 'MPa'), m: () => i18n.unit(v, 'm'), kg: () => i18n.unit(v, 't') }[unit]?.() ?? i18n.num(v, 2);
}

/** @param {App} app */
export async function cardsExtension(app) {
  const { ctx } = app;
  const i18n = ctx.i18n;
  /** @type {Record<string,string>} */
  const html = {};
  for (const map of [ctx.content.explain, ctx.content.assumptions]) {
    for (const [id, md] of map) html[id] = await markdown(md.trim());
  }
  const root = /** @type {HTMLElement} */ (document.querySelector('#cards'));
  const sketch = /** @type {HTMLElement} */ (document.querySelector('#sketch'));
  const util = /** @type {HTMLElement} */ (document.querySelector('#util'));
  const desktop = matchMedia('(min-width: 768px)');
  /** @type {Record<string, boolean>} */
  const open = {};
  root.addEventListener('toggle', (e) => {
    const d = /** @type {HTMLDetailsElement} */ (e.target);
    if (d.dataset.card) open[d.dataset.card] = d.open;
  }, true);
  const rerender = () => app.render();

  /** @param {Result} r @param {string} id */
  function cardEta(r, id) {
    /** @type {Check[]} */
    const cs = r.checks.filter((c) => (id === 'transport' ? c.id.startsWith('transport') || c.id === 'concrete.m' : c.id === id));
    const vals = cs.map((c) => c.eta).filter((e) => e != null);
    return vals.length ? Math.max(.../** @type {number[]} */ (vals)) : null;
  }

  /** @param {string} id @param {Result} r */
  function sources(id, r) {
    const preset = ctx.presets[app.state.preset];
    const fields = /** @type {string[]} */ (SOURCE_FIELDS[/** @type {keyof typeof SOURCE_FIELDS} */ (id)]);
    const used = preset.sources.filter((/** @type {any} */ s) => s.fields.some((/** @type {string} */ f) => fields.includes(f)));
    const items = used.map((/** @type {any} */ s) => `<li>${esc(s.title)}${s.page && s.page !== '–' ? `, ${esc(i18n.t('sources.page', { page: s.page }))}` : ''}${s.derived ? ` – <em>${esc(s.derived)}</em>` : ''}</li>`);
    items.push(`<li>${esc(i18n.t('source.own'))} (${esc(i18n.t('group.geometry'))}, k_φ, ${esc(i18n.t('group.limits'))})</li>`);
    if (r.inputs.presetId) items.push(`<li>${esc(i18n.t('source.presets'))}</li>`);
    return `<ul>${items.join('')}</ul>`;
  }

  /** @param {Result} r */
  function feBlock(r) {
    if (!app.isPresetUnchanged() || !r.f1) return `<p class="fe">${esc(i18n.t('fe.noReference'))}</p>`;
    const fe = ctx.feRef.cases[`${app.state.preset}-${app.state.type}`]?.f1_hz;
    if (!fe) return `<p class="fe">${esc(i18n.t('fe.noReference'))}</p>`;
    const dev = ((r.f1.rayleigh_hz - fe) / fe) * 100;
    return `<p class="fe"><strong>${esc(i18n.t('fe.title'))}</strong><br>${esc(i18n.t('fe.values', { ray: i18n.num(r.f1.rayleigh_hz, 4), fe: i18n.num(fe, 4), dev: i18n.num(dev, 2) }))}</p>`;
  }

  /** @param {string} id @param {Result} r */
  function derivation(id, r) {
    const formulas = FORMULAS[/** @type {keyof typeof FORMULAS} */ (id)]
      .filter((f) => f !== 'check.concrete' || r.inputs.type === 'hybrid')
      .map((f) => `${f === 'f1.hand' ? `<p class="note">${esc(i18n.t('derivation.handFormula'))}</p>` : ''}<div class="formula">${tex(ctx.formulas[f], rerender)}</div>`).join('');
    const asm = (/** @type {Record<string,string[]>} */ ({
      freq: ['asm.rayleighShape', 'asm.kPhi', 'asm.hubOffset', 'asm.uncracked', 'asm.kAdd', 'asm.rnaRotary'],
      stress: ['asm.loadIndicator', 'asm.windProfile', 'asm.loadFactors', 'asm.fyTable'],
      transport: ['asm.transportLimits', ...(r.inputs.type === 'hybrid' ? ['asm.ringParts'] : [])],
      crane: ['asm.hookAllowance', 'asm.craneCapacity'],
      masses: ['asm.kAdd', 'asm.uncracked'],
    }))[id];
    const isOpen = open[id] ?? desktop.matches;
    return `<details class="derivation" data-card="${id}"${isOpen ? ' open' : ''}><summary>${esc(i18n.t('derivation.toggle'))} ▸</summary>`
      + (html[`explain.${id}`] ?? '')
      + `<h4>${esc(i18n.t('derivation.formula'))}</h4>${formulas}`
      + `<h4>${esc(i18n.t('derivation.assumptions'))}</h4><ul>${asm.map((a) => `<li>${html[a] ?? esc(a)}</li>`).join('')}</ul>`
      + `<h4>${esc(i18n.t('derivation.source'))}</h4>${sources(id, r)}`
      + (id === 'freq' ? feBlock(r) : '')
      + (id === 'masses' && r.inputs.presetId === 'generic-7mw' ? `<h4>${esc(i18n.t('scaling.title'))}</h4><div class="formula">${tex(ctx.formulas['scaling.7mw'], rerender)}</div>${html['explain.scaling'] ?? ''}` : '')
      + '</details>';
  }

  /** @param {[string,string][]} rows */
  const kv = (rows) => `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

  /** @param {string} id @param {Result} r */
  function body(id, r) {
    const errs = r.errors.filter((e) => (id === 'freq' && e.id === 'freq') || (id === 'stress' && e.id === 'stress'))
      .map((e) => `<p class="error-note">${esc(i18n.t(e.key, fmtParams(e.params, i18n)))}</p>`).join('');
    if (!r.f1 || !r.masses || !r.segments || !r.crane || !r.loads) return `<p class="sentence">${esc(i18n.t('verdict.noResult'))}</p>`;
    switch (id) {
      case 'freq': {
        const b = r.bands;
        return kv([
          [i18n.t('value.f1'), i18n.unit(r.f1.rayleigh_hz, 'Hz')],
          [i18n.t('value.f1hand'), i18n.unit(r.f1.hand_hz, 'Hz')],
          [i18n.t('value.window'), b?.window ? `${i18n.num(b.window[0], 3)} – ${i18n.num(b.window[1], 3)} Hz` : '—'],
          ['1P', b ? `${i18n.num(b.p1[0], 3)} – ${i18n.num(b.p1[1], 3)} Hz` : '—'],
          ['3P', b ? `${i18n.num(b.p3[0], 3)} – ${i18n.num(b.p3[1], 3)} Hz` : '—'],
        ]) + errs + campbellSvg(r, i18n);
      }
      case 'stress': {
        const s = r.stress;
        const dtNote = r.dt?.hint ? `<p class="warn-note">${esc(i18n.t(`dt.${r.dt.hint}`))}</p>` : '';
        return kv([
          [i18n.t('value.thrust'), i18n.unit(r.loads.thrust_N, 'kN')],
          [i18n.t('value.baseMoment'), i18n.unit(r.loads.baseMoment_Nm, 'MNm')],
          [i18n.t('value.sigma'), s?.sigma_Pa ? i18n.unit(s.sigma_Pa, 'MPa') : '—'],
          [i18n.t('value.sigmaLimit'), s?.limit_Pa ? i18n.unit(s.limit_Pa, 'MPa') : '—'],
          [i18n.t('value.dt'), r.dt ? `${i18n.num(r.dt.min, 0)} – ${i18n.num(r.dt.max, 0)}` : '—'],
        ]) + errs + dtNote + `<p class="note">${esc(i18n.t('label.loadIndicator'))}</p>`;
      }
      case 'transport': {
        const rows = r.segments.steel.map((s, i) => [String(i + 1), `${i18n.num(s.zBot, 1)} – ${i18n.num(s.zTop, 1)} m`, i18n.unit(s.length_m, 'm', 1), i18n.unit(s.dMax_m, 'm'), i18n.unit(s.mass_kg, 't')]);
        const table = `<div class="table-scroll"><table><thead><tr><th>#</th><th>z</th><th class="num">L</th><th class="num">D<sub>max</sub></th><th class="num">m</th></tr></thead><tbody>${
          rows.map((c) => `<tr><td>${c[0]}</td><td>${esc(c[1])}</td><td class="num">${esc(c[2])}</td><td class="num">${esc(c[3])}</td><td class="num">${esc(c[4])}</td></tr>`).join('')}</tbody></table></div>`;
        return kv(r.checks.filter((c) => c.id.startsWith('transport') || c.id === 'concrete.m')
          .map((c) => [checkLabel(c.id, i18n), `${fmtCheckValue(c.demand, c.unit, i18n)} / ${fmtCheckValue(c.limit, c.unit, i18n)}`])) + table;
      }
      case 'crane': {
        const c = r.checks.find((x) => x.id === 'crane');
        return kv([
          [i18n.t('value.heaviest'), `${i18n.t(`lift.${r.crane.source}`)}: ${i18n.unit(r.crane.mass_kg, 't')}`],
          [i18n.t('value.hook'), i18n.unit(r.crane.hookHeight_m, 'm', 0)],
          [i18n.t('value.capacity'), c ? i18n.unit(c.limit, 't', 0) : '—'],
        ]);
      }
      case 'masses':
        return massBarsSvg(r, i18n) + kv([
          [i18n.t('mass.steel'), i18n.unit(r.masses.steel_kg, 't', 0)],
          [i18n.t('mass.concrete'), i18n.unit(r.masses.concrete_kg, 't', 0)],
          [i18n.t('mass.rna'), i18n.unit(r.masses.rna_kg, 't', 0)],
          [i18n.t('mass.total'), i18n.unit(r.masses.total_kg, 't', 0)],
        ]);
      default:
        return '';
    }
  }

  /** @param {Result} r */
  function renderUtil(r) {
    const gov = r.governing?.id;
    const rows = r.checks.map((c) => `<tr${c.id === gov ? ' class="governing"' : ''}><td>${esc(checkLabel(c.id, i18n))}${c.id === gov ? ` <small>(${esc(i18n.t('table.governing'))})</small>` : ''}</td>`
      + `<td class="num">${c.eta == null ? '—' : esc(i18n.num(c.eta, 2))}</td><td class="num">${esc(fmtCheckValue(c.demand, c.unit, i18n))}</td><td class="num">${esc(fmtCheckValue(c.limit, c.unit, i18n))}</td></tr>`).join('');
    util.innerHTML = `<h3>${esc(i18n.t('table.title'))}</h3>${r.checks.length ? utilisationBarsSvg(r.checks, i18n, gov) : ''}`
      + `<div class="table-scroll"><table id="util-table"><thead><tr><th>${esc(i18n.t('table.check'))}</th><th class="num">${esc(i18n.t('table.eta'))}</th><th class="num">${esc(i18n.t('table.demand'))}</th><th class="num">${esc(i18n.t('table.limit'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  app.addRenderer({
    update(r) {
      sketch.innerHTML = r.tower.stations.length ? towerSketchSvg(r, i18n) : '';
      root.innerHTML = CARDS.map((id) => {
        const eta = id === 'masses' ? null : cardEta(r, id);
        const v = id === 'masses' ? 'none' : verdict(eta);
        return `<article class="card card-${id}" data-verdict="${v}"><h3><span>${esc(i18n.t(`card.${id}.title`))}</span>`
          + `<span class="eta">${eta == null ? (id === 'masses' ? '' : 'η —') : `η = ${esc(i18n.num(eta, 2))}`}</span></h3>`
          + `<p class="sentence">${esc(cardSentence(id, r, i18n))}</p>${body(id, r)}${r.f1 ? derivation(id, r) : ''}</article>`;
      }).join('');
      renderUtil(r);
    },
  });
}
