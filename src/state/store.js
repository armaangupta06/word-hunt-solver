const state = {
  connected: false,
  machineRunning: false,
  someOtherState: null,
};

// Get a copy of the state (to prevent direct mutation)
export const getState = () => ({ ...state });

// Update the state with new values
export const updateState = (newState) => {
  Object.keys(newState).forEach((key) => {
    if (key in state) {
      state[key] = newState[key];
    } else {
      console.warn(`Unknown state key: ${key}`);
    }
  });
};

// Subscribe to state changes (observer pattern)
const listeners = [];

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

// Notify all subscribers about state changes
const notify = () => {
  listeners.forEach((listener) => listener(getState()));
};

// Wrap updateState to notify subscribers
export const setState = (newState) => {
  updateState(newState);
  notify();
};