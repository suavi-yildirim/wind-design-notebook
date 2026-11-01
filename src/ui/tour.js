// @ts-check
/** Guided tour: four steps, each sets a preset and highlights a section (spec §7.4). */
import { markdown } from './page-common.js';
import { esc } from '../charts/svg.js';

/** @typedef {import('./app.js').App} App */

export const TOUR_STEPS = Object.freeze([
  { id: 'tour.1', preset: 'generic-5mw', type: /** @type {const} */ ('steel'), target: '#verdict' },
  { id: 'tour.2', preset: 'generic-5mw', type: /** @type {const} */ ('steel'), target: '#variant .card-freq' },
  { id: 'tour.3', preset: 'generic-7mw', type: /** @type {const} */ ('steel'), target: '#variant .card-transport' },
  { id: 'tour.4', preset: 'generic-7mw', type: /** @type {const} */ ('hybrid'), target: '#design-space' },
]);

/** @param {App} app */
export async function tourExtension(app) {
  const i18n = app.ctx.i18n;
  /** @type {Record<string,string>} */
  const html = {};
  for (const s of TOUR_STEPS) html[s.id] = await markdown(app.ctx.content.tour.get(s.id)?.trim() ?? '');
  const startBtn = /** @type {HTMLButtonElement} */ (document.querySelector('#tour-start'));
  /** @type {HTMLElement|null} */
  let dialog = null;
  /** @type {Element|null} */
  let highlighted = null;
  let step = 0;

  function close() {
    highlighted?.classList.remove('tour-highlight');
    highlighted = null;
    dialog?.remove();
    dialog = null;
    document.removeEventListener('keydown', onKey);
    startBtn.focus();
  }

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function show() {
    const s = TOUR_STEPS[step];
    if (app.state.preset !== s.preset || app.state.type !== s.type || !app.isPresetUnchanged()) app.selectPreset(s.preset, s.type);
    highlighted?.classList.remove('tour-highlight');
    highlighted = document.querySelector(s.target);
    highlighted?.classList.add('tour-highlight');
    highlighted?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (!dialog) {
      dialog = document.createElement('section');
      dialog.className = 'tour-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'false');
      dialog.setAttribute('aria-labelledby', 'tour-heading');
      dialog.tabIndex = -1;
      document.body.append(dialog);
      dialog.addEventListener('click', (e) => {
        const a = /** @type {HTMLElement} */ (e.target).dataset.tour;
        if (a === 'next') { if (step < TOUR_STEPS.length - 1) { step += 1; show(); } else close(); }
        if (a === 'back' && step > 0) { step -= 1; show(); }
        if (a === 'close') close();
      });
      document.addEventListener('keydown', onKey);
    }
    const last = step === TOUR_STEPS.length - 1;
    dialog.innerHTML = `<p class="tour-step">${esc(i18n.t('tour.step', { n: step + 1, total: TOUR_STEPS.length }))}</p>`
      + `<div id="tour-heading-wrap">${html[s.id].replace('<h3>', '<h3 id="tour-heading">')}</div>`
      + `<div class="tour-buttons"><button type="button" class="btn btn-ghost btn-small" data-tour="close">${esc(i18n.t('tour.close'))}</button>`
      + `<button type="button" class="btn btn-ghost btn-small" data-tour="back"${step === 0 ? ' disabled' : ''}>${esc(i18n.t('tour.back'))}</button>`
      + `<button type="button" class="btn btn-small" data-tour="next">${esc(i18n.t(last ? 'tour.done' : 'tour.next'))}</button></div>`;
    dialog.focus();
  }

  startBtn.addEventListener('click', () => { step = 0; show(); });
  // Cards are re-rendered on every update; keep the highlight on the current target.
  app.addRenderer({
    update() {
      if (!dialog) return;
      const target = document.querySelector(TOUR_STEPS[step].target);
      if (target && target !== highlighted) {
        highlighted?.classList.remove('tour-highlight');
        highlighted = target;
        highlighted.classList.add('tour-highlight');
      }
    },
  });
}
