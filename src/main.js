// src/main.js

import { domReady } from './utils/domReady.js';
import { initMachineController} from './components/addMachineControl.js';
import { initWordSearchController } from './components/wordSearchController.js';

domReady(() => {
    console.log('App initialized');
    initMachineController();
    initWordSearchController();
});
