(() => {
  // src/state/store.js
  var state = {
    connected: false,
    machineRunning: false,
    someOtherState: null
  };
  var getState = () => ({ ...state });
  var updateState = (newState) => {
    Object.keys(newState).forEach((key) => {
      if (key in state) {
        state[key] = newState[key];
      } else {
        console.warn(`Unknown state key: ${key}`);
      }
    });
  };
  var listeners = [];
  var subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };
  var notify = () => {
    listeners.forEach((listener) => listener(getState()));
  };
  var setState = (newState) => {
    updateState(newState);
    notify();
  };

  // src/haxidraw/cobs.js
  function encode(buf) {
    var dest = [0];
    var code_ptr = 0;
    var code = 1;
    function finish(incllast) {
      dest[code_ptr] = code;
      code_ptr = dest.length;
      incllast !== false && dest.push(0);
      code = 1;
    }
    for (var i = 0; i < buf.length; i++) {
      if (buf[i] == 0) {
        finish();
      } else {
        dest.push(buf[i]);
        code += 1;
        if (code == 255) {
          finish();
        }
      }
    }
    finish(false);
    dest.push(0);
    return Uint8Array.from(dest);
  }
  function decode(buf) {
    var dest = [];
    for (var i = 0; i < buf.length; ) {
      var code = buf[i++];
      for (var j = 1; j < code; j++) {
        dest.push(buf[i++]);
      }
      if (code < 255 && i < buf.length) {
        dest.push(0);
      }
    }
    return Uint8Array.from(dest);
  }

  // src/haxidraw/createComsManager.js
  var TERMINATOR = 10;
  async function createComsManager(buffer) {
    const msgHandlers = {};
    const msgPromises = {};
    let msgCount = 0;
    setInterval(() => {
      let msg = [];
      while (buffer.available()) {
        const byte = buffer.read();
        msg.push(byte);
        if (byte === TERMINATOR) {
          const data = unpack(msg);
          if (data.msg === "ack") {
            const resolver = msgPromises[data.msgCount];
            resolver(data.payload);
            console.log("resolved", data);
          } else if (data.msg in msgHandlers) {
            msgHandlers[data.msg](data.payload);
            const ackBuffer = pack("ack", new Uint8Array(0), data.msgCount);
            const encodedAck = encode(ackBuffer);
            buffer.write(encodedAck);
          } else {
            const msgString = String.fromCharCode.apply(null, msg);
            console.log("unknown msg:", { msg, msgString });
          }
          msg = [];
        }
      }
    }, 0);
    function on(msg, func) {
      msgHandlers[msg] = func;
    }
    function send(msg, payload = []) {
      let packedMsg = pack(msg, payload, msgCount);
      packedMsg = encode(packedMsg);
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log("No response received for msg:", msgCount);
          resolve();
        }, 5e3);
        msgPromises[msgCount] = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
      console.log("sending", {
        msg,
        payload,
        msgCount,
        packedMsg,
        decoded: decode(packedMsg),
        unpacked: unpack(decode(packedMsg))
      });
      buffer.write(packedMsg);
      msgCount = (msgCount + 1) % 9;
      return promise;
    }
    async function close() {
      await buffer.close();
      return;
    }
    return {
      on,
      send,
      close
    };
  }
  function pack(msg, payload, msgCount) {
    const buffer = [];
    if (msg.length > 255) console.error("msg too long");
    buffer.push(msg.length);
    msg.split("").forEach((char) => buffer.push(char.charCodeAt(0)));
    if (payload.length > 255) console.error("payload too long");
    buffer.push(payload.length);
    payload.forEach((byte) => buffer.push(byte));
    buffer.push(msgCount);
    return new Uint8Array(buffer);
  }
  function unpack(bytes) {
    let i = 0;
    const msgLength = bytes[i++];
    const msgBytes = [];
    while (i < 1 + msgLength) {
      msgBytes.push(bytes[i]);
      i++;
    }
    const payloadLength = bytes[i++];
    const payloadBytes = [];
    while (i < 1 + msgLength + 1 + payloadLength) {
      payloadBytes.push(bytes[i]);
      i++;
    }
    const msgCount = bytes[i++];
    const msgString = String.fromCharCode.apply(null, msgBytes);
    return {
      msg: msgString,
      payload: payloadBytes,
      msgCount
    };
  }

  // src/haxidraw/converters.js
  function floatsToBytes(arr) {
    var data = new Float32Array(arr);
    var buffer = new ArrayBuffer(data.byteLength);
    var floatView = new Float32Array(buffer).set(data);
    var byteView = new Uint8Array(buffer);
    return byteView;
  }
  function intsToBytes(arr) {
    var data = new Uint32Array(arr);
    var buffer = new ArrayBuffer(data.byteLength);
    var intView = new Uint32Array(buffer).set(data);
    var byteView = new Uint8Array(buffer);
    return byteView;
  }

  // src/haxidraw/createHaxidraw.js
  async function createHaxidraw(comsBuffer) {
    const port = await createComsManager(comsBuffer);
    async function goTo(x, y) {
      const bytes = floatsToBytes([x, y]);
      await port.send("go", bytes);
    }
    async function servo(angle) {
      const bytes = intsToBytes([angle]);
      await port.send("servo", bytes);
    }
    return {
      port,
      goTo,
      // setAccel,
      // setMaxSpeed,
      servo
    };
  }

  // src/haxidraw/createWebSerialBuffer.js
  async function createWebSerialBuffer(port, baudrate = 115200) {
    const buffer = [];
    await port.open({ baudRate: baudrate });
    let reader = null;
    let writer = null;
    async function stuffBuffer() {
      try {
        while (port.readable) {
          reader = port.readable.getReader();
          while (true) {
            const { value, done } = await reader.read();
            if (value) {
              for (let i = 0; i < value.length; i++) {
                buffer.push(value[i]);
              }
            }
            if (done) {
              reader.releaseLock();
              reader = null;
              break;
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
      }
    }
    stuffBuffer();
    async function write(msg) {
      writer = port.writable.getWriter();
      await writer.write(msg);
      writer.releaseLock();
      writer = null;
    }
    return {
      write,
      read: () => buffer.length > 0 ? buffer.shift() : null,
      available: () => buffer.length > 0,
      close: async () => {
        if (reader) {
          reader.releaseLock();
        }
        if (writer) {
          writer.releaseLock();
        }
        await port.close();
        return;
      }
    };
  }

  // src/components/addMachineControl.js
  var haxidraw = null;
  var initMachineController = () => {
    const connectButton = document.getElementById("connectButton");
    const motorsOnButton = document.getElementById("motorsOnButton");
    const motorsOffButton = document.getElementById("motorsOffButton");
    const setOriginButton = document.getElementById("setOriginButton");
    const goToButton = document.getElementById("goToButton");
    const statusDiv = document.getElementById("status");
    const updateUI = () => {
      const { connected } = getState();
      if (connected) {
        connectButton.innerText = "Disconnect";
        connectButton.classList.add("connected");
        statusDiv.innerText = "Status: Connected";
        [motorsOnButton, motorsOffButton, setOriginButton, goToButton].forEach(
          (btn) => btn.disabled = false
        );
      } else {
        connectButton.innerText = "Connect";
        connectButton.classList.remove("connected");
        statusDiv.innerText = "Status: Disconnected";
        [motorsOnButton, motorsOffButton, setOriginButton, goToButton].forEach(
          (btn) => btn.disabled = true
        );
      }
    };
    subscribe(updateUI);
    updateUI();
    connectButton.addEventListener("click", handleConnectClick);
    motorsOnButton.addEventListener("click", () => sendCommand("motorsOn"));
    motorsOffButton.addEventListener("click", () => sendCommand("motorsOff"));
    setOriginButton.addEventListener("click", () => sendCommand("setOrigin"));
    goToButton.addEventListener("click", handleGoToClick);
  };
  var handleConnectClick = async () => {
    if (!navigator.serial) {
      alert("Your browser doesn't support the Web Serial API. Use Chrome 89 or higher.");
      return;
    }
    if (!haxidraw) {
      try {
        const port = await navigator.serial.requestPort({ filters: [] });
        const comsBuffer = await createWebSerialBuffer(port);
        haxidraw = await createHaxidraw(comsBuffer);
        console.log("Connected:", haxidraw);
        setState({ connected: true });
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    } else {
      console.log("Disconnecting...");
      await haxidraw.port.close();
      haxidraw = null;
      setState({ connected: false });
    }
  };
  var sendCommand = (command) => {
    if (haxidraw) {
      haxidraw.port.send(command);
    } else {
      console.log("Not connected to Blot.");
    }
  };
  var handleGoToClick = () => {
    if (haxidraw) {
      const x = parseFloat(prompt("Enter X position:"));
      const y = parseFloat(prompt("Enter Y position:"));
      if (!isNaN(x) && !isNaN(y)) {
        haxidraw.goTo(x, y);
      } else {
        alert("Invalid coordinates.");
      }
    } else {
      console.log("Not connected to Blot.");
    }
  };

  // src/utils/domReady.js
  var domReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  };

  // src/main.js
  domReady(() => {
    console.log("App initialized");
    initMachineController();
  });
})();
