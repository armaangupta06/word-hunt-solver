(() => {
  // src/utils/domReady.js
  var domReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  };

  // src/state/store.js
  var state = {
    connected: false,
    machineRunning: false,
    motorsOn: false,
    penDown: false,
    wordSearchGrid: null,
    // New state property for the grid
    foundWords: null,
    // New state property for found words
    selectedWords: null,
    // New state property for optimized words
    haxidraw: null
    // ... any other state properties
  };
  var listeners = [];
  var getState = () => ({ ...state });
  var setState = (newState) => {
    Object.assign(state, newState);
    notifySubscribers();
  };
  var subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };
  var notifySubscribers = () => {
    listeners.forEach((listener) => listener(getState()));
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
      const starTime = performance.now();
      const bytes = floatsToBytes([x, y]);
      await port.send("go", bytes);
    }
    async function servo(angle) {
      const bytes = intsToBytes([angle]);
      await port.send("servo", bytes);
    }
    async function drawPath(path) {
      for (const point of path) {
        await goTo(point.x, point.y);
      }
    }
    async function setOrigin() {
      await goTo(0, 0);
    }
    return {
      port,
      goTo,
      servo,
      drawPath,
      setOrigin
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
  var initMachineController = () => {
    const connectButton = document.getElementById("connectButton");
    const motorsToggleButton = document.getElementById("motorsToggleButton");
    const penToggleButton = document.getElementById("penToggleButton");
    const setOriginButton = document.getElementById("setOriginButton");
    const goToButton = document.getElementById("goToButton");
    const statusDiv = document.getElementById("status");
    const updateUI = () => {
      const { connected, motorsOn, penDown } = getState();
      if (connected) {
        connectButton.innerText = "Disconnect";
        connectButton.classList.add("connected");
        statusDiv.innerText = "Status: Connected";
        [motorsToggleButton, penToggleButton, setOriginButton, goToButton].forEach(
          (btn) => btn.disabled = false
        );
        motorsToggleButton.innerText = motorsOn ? "Turn Motors Off" : "Turn Motors On";
        penToggleButton.innerText = penDown ? "Pen Up" : "Pen Down";
      } else {
        connectButton.innerText = "Connect";
        connectButton.classList.remove("connected");
        statusDiv.innerText = "Status: Disconnected";
        [motorsToggleButton, penToggleButton, setOriginButton, goToButton].forEach(
          (btn) => btn.disabled = true
        );
        motorsToggleButton.innerText = "Turn Motors On";
        penToggleButton.innerText = "Pen Down";
      }
    };
    subscribe(updateUI);
    updateUI();
    connectButton.addEventListener("click", handleConnectClick);
    motorsToggleButton.addEventListener("click", handleMotorsToggleClick);
    penToggleButton.addEventListener("click", handlePenToggleClick);
    setOriginButton.addEventListener("click", () => sendCommand("setOrigin"));
    goToButton.addEventListener("click", handleGoToClick);
  };
  var handleConnectClick = async () => {
    if (!navigator.serial) {
      alert("Your browser doesn't support the Web Serial API. Use Chrome 89 or higher.");
      return;
    }
    let { haxidraw } = getState();
    if (!haxidraw) {
      try {
        const port = await navigator.serial.requestPort({ filters: [] });
        const comsBuffer = await createWebSerialBuffer(port);
        haxidraw = await createHaxidraw(comsBuffer);
        console.log("Connected:", haxidraw);
        setState({ haxidraw, connected: true });
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    } else {
      console.log("Disconnecting...");
      await haxidraw.port.close();
      haxidraw = null;
      setState;
      setState({
        haxidraw,
        connected: false,
        motorsOn: false,
        penDown: false
      });
    }
  };
  var handleMotorsToggleClick = () => {
    const { motorsOn, haxidraw } = getState();
    if (haxidraw) {
      if (motorsOn) {
        console.log("Turning motors off");
        haxidraw.port.send("motorsOff");
        setState({ motorsOn: false });
      } else {
        console.log("Turning motors on");
        haxidraw.port.send("motorsOn");
        setState({ motorsOn: true });
      }
    } else {
      console.log("Not connected to the device.");
    }
  };
  var handlePenToggleClick = () => {
    const { penDown, haxidraw } = getState();
    if (haxidraw) {
      if (penDown) {
        haxidraw.servo(1e3);
        setState({ penDown: false });
      } else {
        haxidraw.servo(1700);
        setState({ penDown: true });
      }
    } else {
      console.log("Not connected to the device.");
    }
  };
  var sendCommand = (command) => {
    const { haxidraw } = getState();
    if (haxidraw) {
      haxidraw.port.send(command);
    } else {
      console.log("Not connected to the device.");
    }
  };
  var handleGoToClick = () => {
    const { haxidraw } = getState();
    if (haxidraw) {
      const x = parseFloat(prompt("Enter X position:"));
      const y = parseFloat(prompt("Enter Y position:"));
      if (!isNaN(x) && !isNaN(y)) {
        haxidraw.goTo(x, y);
      } else {
        alert("Invalid coordinates.");
      }
    } else {
      console.log("Not connected to the device.");
    }
  };

  // src/algorithms/trie/trieBuilder.js
  var TrieNode = class {
    constructor() {
      this.children = {};
      this.isEndOfWord = false;
    }
  };
  var Trie = class {
    constructor() {
      this.root = new TrieNode();
    }
    insert(word) {
      let node = this.root;
      for (const char of word) {
        if (!node.children[char]) {
          node.children[char] = new TrieNode();
        }
        node = node.children[char];
      }
      node.isEndOfWord = true;
    }
    search(word) {
      let node = this.root;
      for (const char of word) {
        if (!node.children[char]) {
          return false;
        }
        node = node.children[char];
      }
      return node.isEndOfWord;
    }
  };

  // src/algorithms/solver.js
  var findWordsInGrid = (grid, trie2) => {
    const ROWS = grid.length;
    const COLS = grid[0].length;
    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1]
    ];
    const foundWords = [];
    const dfs = (x, y, node, path, visited, positions) => {
      if (x < 0 || y < 0 || x >= ROWS || y >= COLS) return;
      if (visited[x][y]) return;
      const char = grid[x][y].toLowerCase();
      if (!node.children[char]) return;
      visited[x][y] = true;
      node = node.children[char];
      path += char;
      positions.push({ x, y });
      if (node.isEndOfWord) {
        foundWords.push({
          word: path,
          positions: [...positions]
          // Clone positions array
        });
      }
      for (const [dx, dy] of directions) {
        dfs(x + dx, y + dy, node, path, visited, positions);
      }
      visited[x][y] = false;
      positions.pop();
    };
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        dfs(i, j, trie2.root, "", visited, []);
      }
    }
    return foundWords;
  };

  // src/algorithms/optimizer.js
  var movementSpeed = 12.5;
  var timeLimit = 90;
  alpha = 1;
  beta = 1;
  var distance = (pos1, pos2) => {
    return Math.max(Math.abs(pos2.x + pos2.y - (pos1.x + pos1.y)), Math.abs(pos2.x - pos2.y - (pos1.x - pos1.y)));
  };
  var getWordScore = (length) => {
    if (length === 3) return 1;
    if (length === 4) return 4;
    if (length === 5) return 8;
    if (length === 6) return 14;
    if (length === 7) return 18;
    return 22;
  };
  var optimizeWords = (foundWords) => {
    const wordsList = foundWords.map((wordObj) => {
      const word = wordObj.word.toLowerCase();
      const positions = wordObj.positions;
      const startPos = positions[0];
      const endPos = positions[positions.length - 1];
      const score = getWordScore(word.length);
      let totalDistance = 0;
      for (let i = 1; i < positions.length; i++) {
        totalDistance += //take the max of x+y and x - y
        distance(positions[i - 1], positions[i]);
      }
      const inputTime = totalDistance / movementSpeed;
      return {
        word,
        positions,
        startPos,
        endPos,
        inputTime,
        score,
        distance: totalDistance
      };
    });
    let currentPosition = { x: 0, y: 0 };
    let totalTime = 0;
    const selectedWords = [];
    let remainingWords = [...wordsList];
    while (totalTime < timeLimit && remainingWords.length > 0) {
      remainingWords.forEach((wordObj) => {
        const movementTime = 0.19 + distance(currentPosition, wordObj.startPos) / movementSpeed;
        const totalTimeForWord = wordObj.inputTime + movementTime;
        wordObj.efficiencyScore = Math.pow(wordObj.score, alpha) / Math.pow(totalTimeForWord, beta);
        wordObj.totalTime = totalTimeForWord;
        wordObj.movementTime = movementTime;
      });
      remainingWords.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
      const nextWord = remainingWords.shift();
      if (totalTime + nextWord.totalTime > timeLimit) {
        continue;
      }
      selectedWords.push(nextWord);
      totalTime += nextWord.totalTime;
      currentPosition = nextWord.endPos;
      remainingWords = remainingWords.filter((word) => word.word !== nextWord.word);
    }
    console.log(selectedWords.reduce((sum, word) => sum + word.score * 100, 0));
    return selectedWords;
  };

  // src/views/wordSearchView.js
  var renderWordSearchGrid = (container, grid) => {
    container.innerHTML = "";
    grid.forEach((row, rowIndex) => {
      const rowElement = document.createElement("div");
      rowElement.classList.add("grid-row");
      row.forEach((cell, cellIndex) => {
        const cellElement = document.createElement("div");
        cellElement.classList.add("grid-cell");
        cellElement.innerText = cell;
        cellElement.dataset.row = rowIndex;
        cellElement.dataset.col = cellIndex;
        cellElement.id = `cell-${rowIndex}-${cellIndex}`;
        cellElement.addEventListener("click", (event) => {
          handleCellClick(event, rowIndex, cellIndex);
        });
        rowElement.appendChild(cellElement);
      });
      container.appendChild(rowElement);
    });
    if (!document.getElementById("linesOverlay")) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "linesOverlay";
      container.appendChild(svg);
    }
  };
  var updateFoundWords = (foundWords) => {
    const foundWordsContainer = document.getElementById("foundWordsContainer");
    foundWordsContainer.innerHTML = "";
    foundWords.forEach((wordObj) => {
      const wordElement = document.createElement("div");
      wordElement.classList.add("found-word");
      wordElement.innerText = wordObj.word;
      wordElement.dataset.positions = JSON.stringify(wordObj.positions);
      wordElement.dataset.score = wordObj.score;
      wordElement.addEventListener("mouseover", handleWordHover);
      wordElement.addEventListener("mouseout", handleWordHoverOut);
      foundWordsContainer.appendChild(wordElement);
    });
  };
  var highlightWord = (wordObj) => {
    const foundWordsContainer = document.getElementById("foundWordsContainer");
    const wordElements = Array.from(foundWordsContainer.getElementsByClassName("found-word"));
    const wordElement = wordElements.find((el) => el.innerText === wordObj.word);
    if (wordElement) {
      wordElement.classList.add("highlighted");
      wordElement.scrollIntoView({
        behavior: "smooth",
        // Smooth scrolling
        block: "center",
        // Aligns the element's nearest edge to the visible area
        inline: "start"
        // Aligns the element's inline start edge to the visible area
      });
      const positions = wordObj.positions;
      positions.forEach((pos) => {
        const cell = document.getElementById(`cell-${pos.x}-${pos.y}`);
        if (cell) {
          cell.classList.add("highlight");
        }
      });
      drawConnectingLines(positions);
    }
  };
  var unhighlightWord = (wordObj) => {
    const foundWordsContainer = document.getElementById("foundWordsContainer");
    const wordElements = Array.from(foundWordsContainer.getElementsByClassName("found-word"));
    const wordElement = wordElements.find((el) => el.innerText === wordObj.word);
    if (wordElement) {
      wordElement.classList.remove("highlighted");
      const positions = wordObj.positions;
      positions.forEach((pos) => {
        const cell = document.getElementById(`cell-${pos.x}-${pos.y}`);
        if (cell) {
          cell.classList.remove("highlight");
        }
      });
      removeConnectingLines();
    }
  };
  var handleWordHover = (event) => {
    const wordElement = event.currentTarget;
    const positions = JSON.parse(wordElement.dataset.positions);
    const cells = document.querySelectorAll(".grid-cell");
    cells.forEach((cell) => {
      cell.classList.remove("highlight");
    });
    positions.forEach((pos) => {
      const cell = document.getElementById(`cell-${pos.x}-${pos.y}`);
      if (cell) {
        cell.classList.add("highlight");
      }
    });
    drawConnectingLines(positions);
  };
  var handleWordHoverOut = (event) => {
    const wordElement = event.currentTarget;
    const positions = JSON.parse(wordElement.dataset.positions);
    const cells = document.querySelectorAll(".grid-cell");
    cells.forEach((cell) => {
      cell.classList.remove("highlight");
    });
    removeConnectingLines();
    const { selectedWords } = getState();
    highlightWords(selectedWords, document.getElementById("gridContainer"));
  };
  var drawConnectingLines = (positions) => {
    const svg = document.getElementById("linesOverlay");
    svg.innerHTML = "";
    for (let i = 0; i < positions.length - 1; i++) {
      const pos1 = positions[i];
      const pos2 = positions[i + 1];
      const cell1 = document.getElementById(`cell-${pos1.x}-${pos1.y}`);
      const cell2 = document.getElementById(`cell-${pos2.x}-${pos2.y}`);
      if (cell1 && cell2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const rect1 = cell1.getBoundingClientRect();
        const rect2 = cell2.getBoundingClientRect();
        const containerRect = svg.getBoundingClientRect();
        const x1 = rect1.left + rect1.width / 2 - containerRect.left;
        const y1 = rect1.top + rect1.height / 2 - containerRect.top;
        const x2 = rect2.left + rect2.width / 2 - containerRect.left;
        const y2 = rect2.top + rect2.height / 2 - containerRect.top;
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#ff5722");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-linecap", "round");
        svg.appendChild(line);
      }
    }
  };
  var removeConnectingLines = () => {
    const svg = document.getElementById("linesOverlay");
    svg.innerHTML = "";
  };
  var highlightWords = (selectedWords, gridContainer) => {
    selectedWords.forEach((wordObj) => {
      wordObj.positions.forEach((pos) => {
        const cell = gridContainer.querySelector(`[data-row="${pos.x}"][data-col="${pos.y}"]`);
        if (cell) {
          cell.classList.add("highlight");
        }
      });
    });
  };
  var handleCellClick = (event, row, col) => {
  };

  // src/utils/coordinateMapper.js
  var GRID_CELL_SIZE_MM = 12.5;
  var mapGridToMachineCoordinates = (gridX, gridY) => {
    return {
      y: gridX * GRID_CELL_SIZE_MM,
      x: gridY * GRID_CELL_SIZE_MM
    };
  };

  // src/algorithms/pathGenerator.js
  var generatePath = (positions) => {
    return positions.map((pos) => mapGridToMachineCoordinates(pos.x, pos.y));
  };

  // src/components/wordSearchController.js
  var trie = null;
  var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var initWordSearchController = () => {
    const generateButton = document.getElementById("generateButton");
    const gridContainer = document.getElementById("gridContainer");
    const solvePuzzleButton = document.getElementById("solveButton");
    generateButton.addEventListener("click", handleGenerateClick);
    loadTrie();
    subscribe((state2) => {
      if (state2.wordSearchGrid) {
        renderWordSearchGrid(gridContainer, state2.wordSearchGrid);
      }
      if (state2.selectedWords) {
        updateFoundWords(state2.selectedWords);
        highlightWords(state2.selectedWords, gridContainer);
        if (state2.connected && state2.selectedWords) {
          solvePuzzleButton.disabled = false;
        }
      }
    });
    solvePuzzleButton.addEventListener("click", handleSolveClick);
  };
  var loadTrie = async () => {
    try {
      const response = await fetch("/trie.json");
      const serializedTrie = await response.json();
      trie = restoreTrie(serializedTrie);
      console.log("Trie loaded successfully.");
    } catch (error) {
      console.error("Failed to load trie:", error);
      alert("Failed to load trie. Please refresh the page or try again later.");
    }
  };
  function restoreTrie(serializedTrie) {
    class TrieNode2 {
      constructor() {
        this.children = {};
        this.isEndOfWord = false;
      }
    }
    const trieInstance = new Trie();
    trieInstance.root = restoreNode(serializedTrie.root);
    return trieInstance;
  }
  function restoreNode(nodeData) {
    const node = new TrieNode();
    node.isEndOfWord = nodeData.isEndOfWord;
    node.children = {};
    for (const [char, childData] of Object.entries(nodeData.children)) {
      node.children[char] = restoreNode(childData);
    }
    return node;
  }
  var drawWord = async (wordObj) => {
    const { haxidraw } = getState();
    if (!haxidraw) {
      alert("Machine is not connected. Please connect first.");
      return;
    }
    console.log("PATH");
    const path = generatePath(wordObj.positions);
    console.log(path);
    try {
      const cells = document.querySelectorAll(".grid-cell");
      cells.forEach((cell) => {
        cell.classList.remove("highlight");
      });
      highlightWord(wordObj);
      const firstPoint = path.shift();
      await haxidraw.goTo(firstPoint.x, firstPoint.y);
      await haxidraw.servo(1700);
      await delay(50);
      await haxidraw.drawPath(path);
      await haxidraw.servo(1e3);
      await delay(110);
      console.log(`Finished drawing word: ${wordObj.word}`);
    } catch (error) {
      console.error(`Error drawing word "${wordObj.word}":`, error);
      alert(`Failed to draw the word "${wordObj.word}". Please try again.`);
      const drawingStatus = document.getElementById("drawingStatus");
      if (drawingStatus) {
        drawingStatus.classList.remove("visible");
      }
    } finally {
      const cells = document.querySelectorAll(".grid-cell");
      cells.forEach((cell) => {
        cell.classList.remove("highlight");
      });
      unhighlightWord(wordObj);
    }
  };
  var updateScoreDisplay = (foundWords) => {
    const estimatedScoreElement = document.getElementById("estimatedScore");
    let totalScore = 0;
    foundWords.forEach((wordObj) => {
      totalScore += wordObj.score * 100;
    });
    estimatedScoreElement.textContent = totalScore;
  };
  var handleGenerateClick = () => {
    const grid = getWordsFromInput();
    if (!trie) {
      alert("Trie is not loaded yet. Please try again shortly.");
      return;
    }
    const foundWords = findWordsInGrid(grid, trie);
    const optimizedWords = optimizeWords(foundWords);
    setState({ wordSearchGrid: grid, selectedWords: optimizedWords });
    updateScoreDisplay(optimizedWords);
  };
  var getWordsFromInput = () => {
    const wordsInput = document.getElementById("wordsInput").value;
    return wordsInput.split(" ").map((row) => row.split(""));
  };
  var handleSolveClick = async () => {
    console.log("Starting drawing process...");
    const { selectedWords } = getState();
    let totalTime = 0;
    let totalScore = 0;
    let startTime = performance.now();
    for (const wordObj of selectedWords) {
      try {
        const wordStartTime = performance.now();
        await drawWord(wordObj);
        const endTime = performance.now();
        const actualWordTime = endTime - wordStartTime;
        const actualTotalTime = endTime - startTime;
        totalTime += wordObj.totalTime;
        console.log(endTime, startTime, wordStartTime);
        console.log(`Theoretical total time so far: ${totalTime}`);
        console.log(`Actual total time so far: ${actualTotalTime / 1e3}`);
        console.log(`Theoretical Time taken for "${wordObj.word}": ${wordObj.totalTime}`);
        console.log(`Actual time taken for "${wordObj.word}": ${actualWordTime / 1e3}`);
        totalScore += wordObj.score * 100;
        console.log(`Total score so far: ${totalScore}`);
      } catch (error) {
        console.error(`Failed to draw word "${wordObj.word}":`, error);
        continue;
      }
    }
    console.log("Drawing process completed.");
  };

  // src/main.js
  domReady(() => {
    console.log("App initialized");
    initMachineController();
    initWordSearchController();
  });
})();
