// @ts-check
/** Entry point of the tower page: registers the page sections, then starts the app. */
import { start, extensions } from './app.js';
import { cardsExtension } from './cards.js';
import { designSpaceExtension } from './design-space.js';
import { compareExtension } from './variants.js';
import { limitsExtension } from './limits.js';

extensions.push(cardsExtension, designSpaceExtension, compareExtension, limitsExtension);
start();
