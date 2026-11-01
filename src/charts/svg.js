// @ts-check
/** Small helpers for hand-built SVG strings. Pure, no DOM. */

/** @param {unknown} s */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** @param {number} x */
export const r1 = (x) => Math.round(x * 10) / 10;

/**
 * Root element with title, role and aria-label.
 * @param {number} w
 * @param {number} h
 * @param {string} title
 * @param {string} label
 * @param {string} body
 * @param {string} [cls]
 */
export function svgRoot(w, h, title, label, body, cls = '') {
  return `<svg class="chart ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(title)}</title>${body}</svg>`;
}

/**
 * Linear scale.
 * @param {number} d0
 * @param {number} d1
 * @param {number} r0
 * @param {number} r1_
 */
export function scale(d0, d1, r0, r1_) {
  return (/** @type {number} */ x) => r0 + ((x - d0) / (d1 - d0)) * (r1_ - r0);
}

/**
 * "Nice" tick values between 0 and max.
 * @param {number} max
 * @param {number} [count]
 */
export function ticks(max, count = 5) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}

/** CSS colour token for a verdict. @param {string} v */
export const verdictColor = (v) => ({ green: 'var(--ok)', amber: 'var(--warn)', red: 'var(--bad)' })[v] ?? 'var(--na)';

/**
 * Accessible data-table fallback for a chart.
 * @param {string} summary
 * @param {string[]} header
 * @param {string[][]} rows
 */
export function dataTable(summary, header, rows) {
  const th = header.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<details class="data-table"><summary>${esc(summary)}</summary><div class="table-scroll"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div></details>`;
}
