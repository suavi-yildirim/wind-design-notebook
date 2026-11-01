// @ts-check
/** Section ④: limitations with one-line reasons and a numbered source list (spec §7.2 item 5). */
import { markdown } from './page-common.js';
import { esc } from '../charts/svg.js';

/** @typedef {import('./app.js').App} App */

/** @param {App} app */
export async function limitsExtension(app) {
  const { ctx } = app;
  const i18n = ctx.i18n;
  const root = /** @type {HTMLElement} */ (document.querySelector('#limits-body'));
  const limits = [];
  for (const [id, md] of ctx.content.limitations) limits.push(`<li data-id="${esc(id)}">${await markdown(md.trim())}</li>`);
  const project = [];
  for (const [id, md] of ctx.content.sources) project.push(`<li data-id="${esc(id)}">${await markdown(md.trim())}</li>`);

  function presetSources() {
    const p = ctx.presets[app.state.preset];
    return p.sources.map((/** @type {any} */ s) => `<li>${esc(s.title)}${s.url ? ` – <a href="${esc(s.url)}" rel="noopener">PDF</a>` : ''}`
      + `<span class="meta">${s.page && s.page !== '–' ? esc(i18n.t('sources.page', { page: s.page })) + ' · ' : ''}`
      + `${s.fields.length ? esc(i18n.t('sources.fields', { fields: s.fields.map((/** @type {string} */ f) => i18n.t(`field.turbine.${f}`)).join(', ') })) : ''}`
      + `${s.derived ? ` · ${esc(s.derived)}` : ''}</span></li>`).join('');
  }

  let shownPreset = '';
  app.addRenderer({
    update() {
      if (shownPreset === app.state.preset) return;
      shownPreset = app.state.preset;
      const p = ctx.presets[app.state.preset];
      root.innerHTML = `<div class="limits-grid"><div><h3>${esc(i18n.t('limits.title'))}</h3><ul class="limit-list">${limits.join('')}</ul></div>`
        + `<div><h3>${esc(i18n.t('sources.title'))}</h3><h4>${esc(p.name[i18n.lang])}</h4><ol class="source-list">${presetSources()}</ol>`
        + `<ol class="source-list" start="${p.sources.length + 1}">${project.join('')}</ol></div></div>`;
    },
  });
}
