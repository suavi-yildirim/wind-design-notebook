// @ts-check
/** Section ②: design-space feasibility map; click a cell to apply it (spec §7.2 item 3). */
import { sweep, applyCell } from '../calc/sweep.js';
import { feasibilityMapSvg } from '../charts/feasibility-map.js';
import { dataTable, esc } from '../charts/svg.js';
import { markdown } from './page-common.js';

/** @typedef {import('./app.js').App} App */

/** @param {App} app */
export async function designSpaceExtension(app) {
  const i18n = app.ctx.i18n;
  const root = /** @type {HTMLElement} */ (document.querySelector('#map'));
  const intro = await markdown(app.ctx.content.explain.get('explain.designSpace')?.trim() ?? '');
  root.innerHTML = `<div class="prose">${intro}</div><p class="map-lead"></p>`
    + '<div class="map-wrap"><div class="map-svg"></div><aside class="map-legend"><ul></ul>'
    + `<p class="map-meta map-hover" aria-live="polite"></p><p class="map-meta">${esc(i18n.t('map.hint'))}</p><p class="map-meta map-time"></p><div class="map-table"></div></aside></div>`;
  const svgBox = /** @type {HTMLElement} */ (root.querySelector('.map-svg'));
  const hover = /** @type {HTMLElement} */ (root.querySelector('.map-hover'));
  /** @type {ReturnType<typeof sweep>|null} */
  let current = null;
  let lastKey = '';
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let timer;

  function compute() {
    const inputs = app.state.inputs;
    const kind = inputs.type;
    const t0 = performance.now();
    const s = sweep(inputs, { kind });
    const ms = performance.now() - t0;
    current = s;
    const { svg, legend, table } = feasibilityMapSvg(s, i18n);
    svgBox.innerHTML = svg;
    /** @type {HTMLElement} */ (root.querySelector('.map-lead')).textContent = i18n.t(`map.lead.${kind}`);
    /** @type {HTMLElement} */ (root.querySelector('.map-legend ul')).innerHTML = legend.map((l) =>
      `<li><span class="swatch" style="background:${l.color};opacity:${l.opacity}"></span>${esc(l.label)}</li>`).join('')
      + `<li><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" style="fill:none;stroke:var(--ink);stroke-width:2.5"/></svg>${esc(i18n.t('map.current'))}</li>`;
    /** @type {HTMLElement} */ (root.querySelector('.map-time')).textContent = i18n.t('map.time', { n: i18n.num(s.nx * s.ny, 0), ms: i18n.num(ms, 0) });
    /** @type {HTMLElement} */ (root.querySelector('.map-table')).innerHTML = dataTable(i18n.t('chart.data'), table.header, table.rows);
    root.dataset.sweepMs = ms.toFixed(1);
  }

  svgBox.addEventListener('click', (e) => {
    const cell = /** @type {SVGElement} */ (e.target).closest?.('rect.cell');
    if (!cell || cell.classList.contains('na') || !current) return;
    const ix = Number(cell.getAttribute('data-ix'));
    const iy = Number(cell.getAttribute('data-iy'));
    app.setInputs(applyCell(app.state.inputs, current.kind, ix, iy, current.nx, current.ny));
  });
  svgBox.addEventListener('mousemove', (e) => {
    const cell = /** @type {SVGElement} */ (e.target).closest?.('rect.cell');
    if (!cell || !current) { hover.textContent = ''; return; }
    const ix = Number(cell.getAttribute('data-ix'));
    const iy = Number(cell.getAttribute('data-iy'));
    const i = iy * current.nx + ix;
    const g = current.governing[i];
    hover.textContent = i18n.t('map.cell', {
      x: i18n.num(current.x.values[ix], 0),
      ylabel: i18n.t(current.kind === 'steel' ? 'map.y.steel' : 'map.y.hybrid').replace(/ \[m\]$/, ''),
      y: i18n.num(current.y.values[iy], current.kind === 'steel' ? 2 : 0),
      check: g ? i18n.t(`check.${g}.label`) : i18n.t('map.na'),
      eta: g ? i18n.num(current.eta[i], 2) : '—',
    });
  });

  app.addRenderer({
    update(r) {
      if (!r.governing && r.errors.length) {
        svgBox.innerHTML = `<p class="map-meta">${esc(i18n.t('map.noSweep'))}</p>`;
        lastKey = '';
        return;
      }
      const key = JSON.stringify(app.state.inputs);
      if (key === lastKey) return;
      lastKey = key;
      clearTimeout(timer);
      timer = setTimeout(compute, current ? 150 : 0);
    },
  });
}
