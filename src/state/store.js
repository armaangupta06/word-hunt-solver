// Initial application state
const state = {
  connected: false,
  machineRunning: false,
  motorsOn: false,
  penDown: false,
  wordSearchGrid: null,  
  foundWords: null,       
  selectedWords: null,    
  haxidraw: null
};

// Array to store listeners
const listeners = [];

/**
 * Get the current state
 * @returns {Object} - The current state
 */
export const getState = () => ({ ...state });

/**
 * Sets the new state
 * @param {Object} newState - The new state to set
 */
export const setState = (newState) => {
  Object.assign(state, newState);
  notifySubscribers();
};

/**
 * Observer pattern to subscribe to state changes
 * @param {Function} listener - The listener function to subscribe
 * @returns {Function} - The unsubscribe function
 */
export const subscribe = (listener) => {
  listeners.push(listener);
  // Return an unsubscribe function
  return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
          listeners.splice(index, 1);
      }
  };
};

/**
 * Notify all subscribers of the state change event
 */
const notifySubscribers = () => {
  listeners.forEach((listener) => listener(getState()));
};
