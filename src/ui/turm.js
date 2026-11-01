// @ts-check
/** Entry point of the tower page: registers the page sections, then starts the app. */
import { start, extensions } from './app.js';
import { cardsExtension } from './cards.js';

extensions.push(cardsExtension);
start();
