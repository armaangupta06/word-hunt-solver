import { setState, getState, subscribe } from '../state/store.js';
import { createHaxidraw } from '../haxidraw/createHaxidraw.js';
import { createWebSerialBuffer } from '../haxidraw/createWebSerialBuffer.js';

/**
 * Initializes the machine controller and sets up UI elements,
 * state subscriptions, and event listeners.
 */
export const initMachineController = () => {
  const connectButton = document.getElementById('connectButton');
  const motorsToggleButton = document.getElementById('motorsToggleButton');
  const penToggleButton = document.getElementById('penToggleButton');
  const setOriginButton = document.getElementById('setOriginButton');
  const goToButton = document.getElementById('goToButton');
  const statusDiv = document.getElementById('status');

  /**
   * Updates the UI elements based on the current machine state.
   */
  const updateUI = () => {
    const { connected, motorsOn, penDown } = getState();

    if (connected) {
      connectButton.innerText = 'Disconnect';
      connectButton.classList.add('connected');
      statusDiv.innerText = 'Status: Connected';

      // Enable buttons for machine control
      [motorsToggleButton, penToggleButton, setOriginButton, goToButton].forEach(
        (btn) => (btn.disabled = false)
      );

      // Update button labels based on motor and pen states
      motorsToggleButton.innerText = motorsOn ? 'Turn Motors Off' : 'Turn Motors On';
      penToggleButton.innerText = penDown ? 'Pen Up' : 'Pen Down';
    } else {
      connectButton.innerText = 'Connect';
      connectButton.classList.remove('connected');
      statusDiv.innerText = 'Status: Disconnected';

      // Disable buttons when disconnected
      [motorsToggleButton, penToggleButton, setOriginButton, goToButton].forEach(
        (btn) => (btn.disabled = true)
      );

      // Reset button labels to default
      motorsToggleButton.innerText = 'Turn Motors On';
      penToggleButton.innerText = 'Pen Down';
    }
  };

  // Subscribe the updateUI function to state changes
  subscribe(updateUI);

  // Initial UI update to reflect current state
  updateUI();

  // Set up event listeners for control buttons
  connectButton.addEventListener('click', handleConnectClick);
  motorsToggleButton.addEventListener('click', handleMotorsToggleClick);
  penToggleButton.addEventListener('click', handlePenToggleClick);
  setOriginButton.addEventListener('click', () => sendCommand('setOrigin'));
  goToButton.addEventListener('click', handleGoToClick);
};

/**
 * Handles the connect/disconnect button click event to manage device connection.
 * Initiates a connection to the device if not connected; otherwise, disconnects.
 */
const handleConnectClick = async () => {
  if (!navigator.serial) {
    alert("Your browser doesn't support the Web Serial API. Use Chrome 89 or higher.");
    return;
  }

  let { haxidraw } = getState();

  if (!haxidraw) {
    // Attempt to connect to the device
    try {
      const port = await navigator.serial.requestPort({ filters: [] });
      const comsBuffer = await createWebSerialBuffer(port);
      haxidraw = await createHaxidraw(comsBuffer);
      console.log('Connected:', haxidraw);

      // Update state to reflect successful connection
      setState({ haxidraw, connected: true });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  } else {
    // Disconnect from the device
    console.log('Disconnecting...');
    await haxidraw.port.close();
    haxidraw = null;

    // Reset state upon disconnection
    setState({
      haxidraw,
      connected: false,
      motorsOn: false,
      penDown: false,
    });
  }
};

/**
 * Handles the toggle button for motors to turn them on or off.
 * Updates the state and sends the appropriate command to the device.
 */
const handleMotorsToggleClick = () => {
  const { motorsOn, haxidraw } = getState();

  if (haxidraw) {
    if (motorsOn) {
      // Send command to turn motors off
      console.log('Turning motors off');
      haxidraw.port.send('motorsOff');
      setState({ motorsOn: false });
    } else {
      // Send command to turn motors on
      console.log('Turning motors on');
      haxidraw.port.send('motorsOn');
      setState({ motorsOn: true });
    }
  } else {
    console.log('Not connected to the device.');
  }
};

/**
 * Handles the toggle button for the pen to raise or lower it.
 * Updates the state and sends the appropriate servo command to the device.
 */
const handlePenToggleClick = () => {
  const { penDown, haxidraw } = getState();

  if (haxidraw) {
    if (penDown) {
      // Raise the pen
      haxidraw.servo(1000); // Adjust servo value as needed
      setState({ penDown: false });
    } else {
      // Lower the pen
      haxidraw.servo(1700); // Adjust servo value as needed
      setState({ penDown: true });
    }
  } else {
    console.log('Not connected to the device.');
  }
};

/**
 * Sends a specified command to the device if connected.
 * @param {string} command - The command to be sent to the device.
 */
const sendCommand = (command) => {
  const { haxidraw } = getState();
  if (haxidraw) {
    haxidraw.port.send(command);
  } else {
    console.log('Not connected to the device.');
  }
};

/**
 * Handles the 'Go To' button click event, prompting the user for X and Y coordinates.
 * Sends the coordinates to the device to move it to the specified position.
 */
const handleGoToClick = () => {
  const { haxidraw } = getState();
  if (haxidraw) {
    const x = parseFloat(prompt('Enter X position:'));
    const y = parseFloat(prompt('Enter Y position:'));

    if (!isNaN(x) && !isNaN(y)) {
      haxidraw.goTo(x, y);
    } else {
      alert('Invalid coordinates.');
    }
  } else {
    console.log('Not connected to the device.');
  }
};
