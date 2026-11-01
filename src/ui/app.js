// @ts-check
/** Tower page wiring: load data, keep state, recalculate and render (spec §4, §7). */
import { evaluate, inputsFromPreset } from '../calc/evaluate.js';
import { loadContent } from '../i18n/i18n.js';
import { initI18n, applyStatic, setupLangToggle, applyGlossary, fetchJson } from './page-common.js';
import { encodeState, decodeState, diffInputs, applyDiff, setPath } from './state.js';
import { renderInputs, syncInputs, markErrors } from './inputs.js';
import { renderVerdict } from './verdict.js';

/** @typedef {import('../calc/types.js').Inputs} Inputs */
/** @typedef {import('../calc/evaluate.js').Result} Result */
/** @typedef {import('./state.js').Variant} Variant */

export const PRESET_IDS = ['generic-3mw', 'generic-5mw', 'generic-7mw'];
export const DEFAULT = { preset: 'generic-5mw', type: /** @type {'steel'|'hybrid'} */ ('steel') };

/**
 * @typedef {{
 *   i18n: import('../i18n/i18n.js').I18n,
 *   presets: Record<string, any>,
 *   feRef: { cases: Record<string, { f1_hz:number }> },
 *   content: Record<string, Map<string,string>>,
 *   formulas: Record<string,string>,
 *   glossary: Record<string, any>,
 * }} Ctx
 * @typedef {{ update:(r:Result, app:App) => void, onLang?:() => void }} Renderer
 * @typedef {ReturnType<typeof createApp>} App
 */

/** @param {Ctx} ctx */
function createApp(ctx) {
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (document.querySelector(s));
  const state = {
    preset: DEFAULT.preset,
    type: DEFAULT.type,
    /** @type {Inputs} */ inputs: inputsFromPreset(ctx.presets[DEFAULT.preset], DEFAULT.type),
    /** @type {Variant[]} */ variants: [],
    /** @type {Result|null} */ result: null,
  };
  /** @type {Renderer[]} */
  const renderers = [];
  let frame = 0;

  const base = () => inputsFromPreset(ctx.presets[state.preset], state.type);
  const isPresetUnchanged = () => Object.keys(diffInputs(base(), state.inputs)).length === 0;

  function writeHash() {
    const s = { v: /** @type {const} */ (1), preset: state.preset, type: state.type, diff: diffInputs(base(), state.inputs), variants: state.variants };
    history.replaceState(null, '', `${location.pathname}${location.search}#s=${encodeState(s)}`);
  }

  function render() {
    frame = 0;
    const r = evaluate(state.inputs);
    state.result = r;
    renderVerdict($('#verdict'), r, ctx.i18n);
    markErrors($('#inputs'), r.errors, ctx.i18n);
    for (const x of renderers) x.update(r, app);
    writeHash();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function rebuildInputs() {
    renderInputs($('#inputs'), state.inputs, ctx.i18n, (path, si) => {
      setPath(state.inputs, path, si);
      schedule();
    });
  }

  function syncControls() {
    /** @type {HTMLSelectElement} */ ($('#preset')).value = state.preset;
    for (const el of document.querySelectorAll('input[name="type"]')) {
      /** @type {HTMLInputElement} */ (el).checked = /** @type {HTMLInputElement} */ (el).value === state.type;
    }
  }

  const app = {
    ctx,
    state,
    isPresetUnchanged,
    /** @param {Renderer} r */
    addRenderer(r) { renderers.push(r); },
    /**
     * Switch preset and/or type; resets the inputs to the preset.
     * @param {string} preset
     * @param {'steel'|'hybrid'} type
     */
    selectPreset(preset, type) {
      state.preset = preset;
      state.type = type;
      state.inputs = base();
      syncControls();
      rebuildInputs();
      render();
    },
    /**
     * Replace the inputs (map click, variant load). Rebuilds fields when the type changes.
     * @param {Inputs} inputs
     */
    setInputs(inputs) {
      const typeChanged = inputs.type !== state.type;
      state.inputs = inputs;
      state.type = inputs.type;
      syncControls();
      if (typeChanged) rebuildInputs();
      else syncInputs($('#inputs'), state.inputs, ctx.i18n);
      render();
    },
    /** @param {Variant[]} v */
    setVariants(v) { state.variants = v; writeHash(); },
    /**
     * Load a saved variant: switch preset/type and apply its inputs.
     * @param {string} preset
     * @param {'steel'|'hybrid'} type
     * @param {Inputs} inputs
     */
    loadVariant(preset, type, inputs) {
      state.preset = preset;
      state.type = type;
      state.inputs = inputs;
      syncControls();
      rebuildInputs();
      render();
    },
    render,
    /** @param {string} msg */
    notice(msg) {
      const n = $('#notice');
      n.textContent = msg;
      n.hidden = false;
    },
  };

  // Header controls
  const sel = /** @type {HTMLSelectElement} */ ($('#preset'));
  for (const id of PRESET_IDS) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = ctx.presets[id].name[ctx.i18n.lang];
    sel.append(o);
  }
  sel.addEventListener('change', () => app.selectPreset(sel.value, state.type));
  for (const el of document.querySelectorAll('input[name="type"]')) {
    el.addEventListener('change', () => app.selectPreset(state.preset, /** @type {'steel'|'hybrid'} */ (/** @type {HTMLInputElement} */ (el).value)));
  }
  $('#reset').addEventListener('click', () => app.selectPreset(state.preset, state.type));

  // Initial state from the URL
  const decoded = decodeState(location.hash, PRESET_IDS);
  if (decoded.ok) {
    state.preset = decoded.state.preset;
    state.type = decoded.state.type;
    const applied = applyDiff(base(), decoded.state.diff);
    state.inputs = applied.inputs;
    state.variants = decoded.state.variants;
    if (applied.unknownPaths.length) app.notice(ctx.i18n.t('state.unknownPaths'));
  } else if (decoded.reason !== 'empty') {
    app.notice(ctx.i18n.t('state.invalid'));
  }
  syncControls();
  rebuildInputs();
  return app;
}

/** Load everything, then render. Extra renderers are registered by later modules via `extensions`. */
export async function start() {
  try {
    const i18n = await initI18n();
    applyStatic(document, i18n);
    setupLangToggle(/** @type {HTMLAnchorElement} */ (document.querySelector('#lang-toggle')), i18n);
    const lang = i18n.lang;
    const [presets, feRef, formulas, glossary, ...blocks] = await Promise.all([
      Promise.all(PRESET_IDS.map((id) => fetchJson(`data/presets/${id}.json`))),
      fetchJson('data/fe-reference.json'),
      fetchJson('content/formulas.json'),
      fetchJson('content/glossary.json'),
      ...['explain', 'assumptions', 'limitations', 'tour', 'sources'].map((n) => loadContent(lang, n)),
    ]);
    /** @type {Ctx} */
    const ctx = {
      i18n, feRef, formulas, glossary,
      presets: Object.fromEntries(presets.map((p) => [p.id, p])),
      content: { explain: blocks[0], assumptions: blocks[1], limitations: blocks[2], tour: blocks[3], sources: blocks[4] },
    };
    const app = createApp(ctx);
    for (const ext of extensions) await ext(app);
    applyGlossary(document, glossary, lang);
    app.render();
    document.body.classList.remove('loading');
    return app;
  } catch (err) {
    console.error(err);
    const n = /** @type {HTMLElement} */ (document.querySelector('#notice'));
    n.textContent = 'Daten konnten nicht geladen werden / Data could not be loaded. (file:// is not supported – use a web server.)';
    n.hidden = false;
    return null;
  }
}

/** @type {((app: App) => void | Promise<void>)[]} */
export const extensions = [];
