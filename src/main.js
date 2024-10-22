import { setState } from './state/store.js';
import { initMachineController } from './components/addMachineControl.js';
import { domReady } from './utils/domReady.js';

domReady(() => {
  console.log('App initialized');
  initMachineController();
});