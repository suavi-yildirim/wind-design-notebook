// @ts-check
/** Landing and About pages: language, static strings, and content blocks from content/<lang>/*.md. */
import { loadContent } from '../i18n/i18n.js';
import { initI18n, applyStatic, setupLangToggle, markdown } from './page-common.js';

async function start() {
  const i18n = await initI18n();
  applyStatic(document, i18n);
  setupLangToggle(/** @type {HTMLAnchorElement} */ (document.querySelector('#lang-toggle')), i18n);
  const titleKey = document.body.dataset.titleKey;
  if (titleKey) document.title = i18n.t(titleKey);
  /** @type {Record<string, Map<string,string>>} */
  const files = {};
  for (const el of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('[data-block]'))) {
    const [file, id] = /** @type {string} */ (el.dataset.block).split(':');
    files[file] ??= await loadContent(i18n.lang, file);
    if (id) el.innerHTML = await markdown(files[file].get(id)?.trim() ?? '');
    else el.innerHTML = (await Promise.all([...files[file].values()].map((md) => markdown(md.trim())))).join('');
  }
}

start().catch((e) => console.error(e));
