// @ts-check
/** URL state `#s=<base64url(JSON)>` (spec §7.5) and dotted-path helpers. Pure, no DOM. */

/** @typedef {{ name:string, preset:string, type:'steel'|'hybrid', diff:Record<string,number> }} Variant */
/** @typedef {{ v:1, preset:string, type:'steel'|'hybrid', diff:Record<string,number>, variants:Variant[] }} State */

/**
 * @param {any} obj
 * @param {string} path dotted path, array indices as numbers
 * @returns {any}
 */
export function getPath(obj, path) {
  let cur = obj;
  for (const k of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, k)) return undefined;
    if (Array.isArray(cur) && !/^\d+$/.test(k)) return undefined;
    cur = cur[k];
  }
  return cur;
}

/**
 * @param {any} obj
 * @param {string} path
 * @param {number} value
 */
export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = /** @type {string} */ (keys.pop());
  const parent = getPath(obj, keys.join('.'));
  parent[last] = value;
}

/**
 * @param {any} obj
 * @param {string} prefix
 * @param {Record<string,number>} out
 */
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out[p] = v;
    else if (v && typeof v === 'object') flatten(v, p, out);
  }
  return out;
}

/**
 * Numeric paths whose value in `current` differs from `base`.
 * @param {object} base
 * @param {object} current
 * @returns {Record<string,number>}
 */
export function diffInputs(base, current) {
  const a = flatten(base, '', {});
  const b = flatten(current, '', {});
  /** @type {Record<string,number>} */
  const diff = {};
  for (const [p, v] of Object.entries(b)) if (p in a && a[p] !== v) diff[p] = v;
  return diff;
}

/**
 * Apply a diff to a copy of `base`. Paths that do not exist (or non-finite values) are reported.
 * @template T
 * @param {T} base
 * @param {Record<string,unknown>} diff
 * @returns {{ inputs:T, unknownPaths:string[] }}
 */
export function applyDiff(base, diff) {
  const inputs = structuredClone(base);
  /** @type {string[]} */
  const unknownPaths = [];
  for (const [p, v] of Object.entries(diff ?? {})) {
    if (typeof getPath(inputs, p) !== 'number' || typeof v !== 'number' || !Number.isFinite(v)) unknownPaths.push(p);
    else setPath(inputs, p, v);
  }
  return { inputs, unknownPaths };
}

/** @param {State} state */
export function encodeState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} hash location.hash, e.g. "#s=…"
 * @param {string[]} presetIds known preset ids
 * @returns {{ ok:true, state:State } | { ok:false, reason:'empty'|'base64'|'json'|'version'|'preset'|'shape' }}
 */
export function decodeState(hash, presetIds) {
  const m = /^#?s=([^&]*)$/.exec(hash ?? '');
  if (!m || !m[1]) return { ok: false, reason: 'empty' };
  let json;
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch { return { ok: false, reason: 'base64' }; }
  /** @type {any} */
  let s;
  try { s = JSON.parse(json); } catch { return { ok: false, reason: 'json' }; }
  if (!s || typeof s !== 'object') return { ok: false, reason: 'shape' };
  if (s.v !== 1) return { ok: false, reason: 'version' };
  const validVariant = (/** @type {any} */ x) => x && presetIds.includes(x.preset) && (x.type === 'steel' || x.type === 'hybrid')
    && x.diff && typeof x.diff === 'object';
  if (!presetIds.includes(s.preset)) return { ok: false, reason: 'preset' };
  if (!validVariant(s)) return { ok: false, reason: 'shape' };
  const variants = Array.isArray(s.variants) ? s.variants.filter(validVariant).slice(0, 3)
    .map((/** @type {any} */ x) => ({ name: String(x.name ?? ''), preset: x.preset, type: x.type, diff: x.diff })) : [];
  return { ok: true, state: { v: 1, preset: s.preset, type: s.type, diff: s.diff, variants } };
}
