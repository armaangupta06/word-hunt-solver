import { setState, getState, subscribe } from '../state/store.js';
import { createHaxidraw } from '../haxidraw/createHaxidraw.js';
import { createWebSerialBuffer } from '../haxidraw/createWebSerialBuffer.js';

let haxidraw = null;

export const initMachineController = () => {
  const connectButton = document.getElementById('connectButton');
  const motorsOnButton = document.getElementById('motorsOnButton');
  const motorsOffButton = document.getElementById('motorsOffButton');
  const setOriginButton = document.getElementById('setOriginButton');
  const goToButton = document.getElementById('goToButton');
  const statusDiv = document.getElementById('status');

  // Update UI based on state
  const updateUI = () => {
    const { connected } = getState();

    if (connected) {
      connectButton.innerText = 'Disconnect';
      connectButton.classList.add('connected');
      statusDiv.innerText = 'Status: Connected';

      // Enable other buttons
      [motorsOnButton, motorsOffButton, setOriginButton, goToButton].forEach(
        (btn) => (btn.disabled = false)
      );
    } else {
      connectButton.innerText = 'Connect';
      connectButton.classList.remove('connected');
      statusDiv.innerText = 'Status: Disconnected';

      // Disable other buttons
      [motorsOnButton, motorsOffButton,setOriginButton, goToButton].forEach(
        (btn) => (btn.disabled = true)
      );
    }
  };

  // Subscribe to state changes
  subscribe(updateUI);

  // Initial UI update
  updateUI();

  // Event Listeners
  connectButton.addEventListener('click', handleConnectClick);
  motorsOnButton.addEventListener('click', () => sendCommand('motorsOn'));
  motorsOffButton.addEventListener('click', () => sendCommand('motorsOff'));
 setOriginButton.addEventListener('click', () => sendCommand('setOrigin'));
  goToButton.addEventListener('click', handleGoToClick);
};

const handleConnectClick = async () => {
  if (!navigator.serial) {
    alert("Your browser doesn't support the Web Serial API. Use Chrome 89 or higher.");
    return;
  }

  if (!haxidraw) {
    // Connect to Blot
    try {
      const port = await navigator.serial.requestPort({ filters: [] });
      const comsBuffer = await createWebSerialBuffer(port);
      haxidraw = await createHaxidraw(comsBuffer);

      console.log('Connected:', haxidraw);

      // Update state
      setState({ connected: true });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  } else {
    // Disconnect
    console.log('Disconnecting...');
    await haxidraw.port.close();
    haxidraw = null;

    // Update state
    setState({ connected: false });
  }
};

const sendCommand = (command) => {
  if (haxidraw) {
    haxidraw.port.send(command);
  } else {
    console.log('Not connected to Blot.');
  }
};

const handleGoToClick = () => {
  if (haxidraw) {
    const x = parseFloat(prompt('Enter X position:'));
    const y = parseFloat(prompt('Enter Y position:'));
    if (!isNaN(x) && !isNaN(y)) {
      haxidraw.goTo(x, y);
    } else {
      alert('Invalid coordinates.');
    }
  } else {
    console.log('Not connected to Blot.');
  }
};