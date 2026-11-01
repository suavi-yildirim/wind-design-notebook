// @ts-check
/** Entry point of the tower page: registers the page sections, then starts the app. */
import { start, extensions } from './app.js';
import { cardsExtension } from './cards.js';
import { designSpaceExtension } from './design-space.js';
import { compareExtension } from './variants.js';
import { limitsExtension } from './limits.js';
import { tourExtension } from './tour.js';
import { exportExtension } from './export.js';
import { layoutExtension } from './layout.js';

extensions.push(layoutExtension, cardsExtension, designSpaceExtension, compareExtension, limitsExtension, tourExtension, exportExtension);
start();
