// @ts-check
/**
 * Wide screens: the inputs move into the sticky left sidebar next to the whole page.
 * Narrow screens: they stay inside section ① so the order is verdict → inputs → results.
 */

export const WIDE_QUERY = '(min-width: 1180px)';

export function layoutExtension() {
  const inputs = /** @type {HTMLElement} */ (document.querySelector('.inputs-col'));
  const side = /** @type {HTMLElement} */ (document.querySelector('#side-panel'));
  const grid = /** @type {HTMLElement} */ (document.querySelector('.variant-grid'));
  const mq = matchMedia(WIDE_QUERY);
  const place = () => {
    document.body.classList.toggle('wide-layout', mq.matches);
    if (mq.matches && inputs.parentElement !== side) side.append(inputs);
    else if (!mq.matches && inputs.parentElement !== grid) grid.prepend(inputs);
  };
  mq.addEventListener('change', place);
  place();
}
