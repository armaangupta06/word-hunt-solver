# Word Hunt Solver

### Overview

**Word Hunt Solver** is a high-performance application that finds and inputs words in Word Hunt-style puzzles using efficient algorithms and robotic control. It combines advanced data structures, embedded communication, and optimized path planning to identify and input words quickly on a grid. The solver uses a Trie for fast word matching, Depth-First Search (DFS) for pathfinding, and a greedy algorithm for path optimization

<img width="1512" alt="image" src="https://github.com/user-attachments/assets/5556f942-b93a-4d2d-9bf6-c9f84ea1da4a">

*The user interface of the Word Hunt Solver.*

---

The program efficiently finds and inputs words in the grid.


https://github.com/user-attachments/assets/1b31ca4d-1cbd-4dec-b808-f3fc9985b560

*Robot autonomously identifying and inputting words on the grid.*


---

### Key Features

- **Optimized Trie Structure** for rapid word lookup and efficient memory usage.
- **DFS Pathfinding with Pruning** for targeted word detection.
- **Greedy Path Optimization Algorithm** to prioritize word selection based on distance and score efficiency.
- **Embedded UART Communication** with a robotic system to execute precise movements.

---

### Repository Structure

```plaintext
word-hunt-solver/
│
├── public/
│   ├── bundle.js              # Bundled JavaScript for the web interface
│   ├── index.html             # Entry point for the web-based UI
│   ├── styles.css             # Styling for the user interface
│   └── trie.json              # Prebuilt Trie data structure in JSON format
├── scripts/
│   └── buildTrie.js           # Script to generate the Trie from the dictionary
├── src/
│   ├── algorithms/
│   │   ├── trie/
│   │   │   ├── dictionary.txt # Comprehensive word list for Trie construction
│   │   │   └── trieBuilder.js # Utility to build the Trie efficiently
│   │   ├── optimizer.js       # Intelligent algorithm for path and word optimization
│   │   ├── pathGenerator.js   # Generates optimal paths for robotic navigation
│   │   └── solver.js          # Core solver integrating Trie and DFS algorithms
│   ├── components/
│   │   ├── addMachineControl.js      # Interface component for machine control
│   │   └── wordSearchController.js   # Manages word search operations and state
│   ├── haxidraw/
│   │   ├── cobs.js                   # Implementation of COBS for reliable communication
│   │   ├── converters.js             # Data converters for serial communication protocols
│   │   ├── createComsManager.js      # Manages communication with the robotic system
│   │   ├── createHaxidraw.js         # Initializes and configures the robotic interface
│   │   ├── createNodeSerialBuffer.js # Buffering for Node.js serial communication
│   │   └── createWebSerialBuffer.js  # Buffering for Web Serial API communication
│   ├── state/
│   │   └── store.js                  # Centralized state management for the application
│   ├── utils/
│   │   └── coordinateMapper.js       # Maps grid coordinates to robotic positions
│   ├── views/
│   │   └── wordSearchView.js         # Renders the word search grid and UI components
│   └── main.js                       # Entry point for the application's logic
├── README.md                         # Project documentation and instructions
```


---

### Algorithmic Design

### 1. Trie-Based Data Preprocessing

The **Trie data structure** is the backbone of the application's rapid word detection capabilities:

- **Ultra-Fast Search Operations**: With an average and worst-case time complexity of \(O(m)\), where \(m\) is the length of the word, the Trie allows for instantaneous prefix checks and word validations, essential for real-time applications.
- **Memory Efficiency**: Implements a compact Trie with shared prefixes to minimize redundancy and optimize memory usage, enabling the handling of extensive dictionaries without performance degradation.
- **Custom Dictionary Integration**: Supports dynamic loading of dictionaries, allowing for multilingual support and specialized vocabulary sets.


### 2. Optimized Depth-First Search (DFS) with Pruning

An enhanced **DFS algorithm** is utilized for exhaustive and efficient word exploration on the grid:

- **Intelligent Pruning**: Incorporates early termination of search paths that cannot lead to valid words based on Trie prefix validation, significantly reducing unnecessary computations.
- **Backtracking Mechanism**: Ensures complete coverage of the grid by methodically exploring all viable paths while avoiding revisiting nodes, maintaining optimal performance even on large grids.
- **Heuristic Enhancements**: Utilizes heuristics to prioritize promising paths, improving search efficiency and speed.

### 3. Greedy Algorithm for Path Optimization

The **Greedy Algorithm** optimizes the path the robot takes to input each word:
- **Efficiency-Based Prioritization**: Words are selected based on a custom efficiency score, calculated by dividing the word score by the estimated time to reach and input it.
- **Euclidean Distance Calculation**: The algorithm calculates the minimum Euclidean distance between the robot's current position and each word's start point.
- **Dynamic Word Selection**: Adjusts word prioritization dynamically based on remaining time and distance to maximize score within given constraints.
- **Movement Prediction**: Utilizes motor calibration data from the firmware to predict exact timings and optimize robot path further.

### 4. Enhanced Beam Search Algorithm

An **Experimental Beam Search Algorithm** is implemented to explore multiple high-potential paths simultaneously:

- **Parallel Path Exploration**: Considers a breadth of promising word sequences in parallel, increasing the likelihood of discovering optimal or near-optimal solutions.
- **Configurable Beam Width**: Allows adjustment of the number of concurrent paths evaluated, balancing computational load with solution quality.
- **Performance Optimization**: Employs advanced pruning techniques to discard suboptimal paths early, conserving resources and focusing on the most promising sequences.

### Embedded System Communication: UART Protocol

**UART Communication** enables real-time control and monitoring of the robotic system:
- **Baud Rate Configuration**: Ensures efficient data transfer with minimal latency.
- **Command Transmission**: Commands for motor control, start/stop, and servo adjustments are sent from the solver to the robot in specific encoded formats.
- **Custom Encoding with COBS**: Utilizes Consistent Overhead Byte Stuffing (COBS) to ensure reliable communication, preventing delimiter errors within the UART data stream.
- **Feedback Loop**: The solver receives acknowledgment and status updates from the robot, enabling it to adjust inputs based on real-time robot positioning and status.

### State Management

A sophisticated **State Management System** maintains synchronization between the software and the robotic hardware:

- **Real-Time Updates**: Continuously tracks the robot's position, operational status, and environmental inputs to inform decision-making.
- **Concurrent State Handling**: Manages multiple states simultaneously, allowing for complex operations like simultaneous movement and sensor data processing.
- **Persistent Storage**: Utilizes persistent storage mechanisms to maintain state information across sessions if necessary.

### Path Planning and Input Order Optimization

To minimize the physical movement of the robot and prioritize high-value words:
- **TSP Solver (Traveling Salesman Problem)**: An algorithm determines the shortest path covering all target words, ensuring the robot minimizes unnecessary movement.
- **Clustered Word Input**: Groups words in close proximity for sequential input, further reducing travel time.
- **Score-Based Priority**: Words are also ranked by game-specific scores to ensure higher-scoring words are inputted within limited time constraints.

---

### Design and Development Insights

The development process involved **trial and error** with several algorithmic approaches:
- **Trie and DFS Pruning**: This combination was refined iteratively, with early versions facing performance bottlenecks due to deep recursion and memory overhead. Optimizations like Radix Trees and bitmasking were introduced to mitigate these.
- **Beam Search Trials**: Initially, Beam Search was proposed to test paths concurrently. However, the lack of performance gains led to its removal.
- **Greedy Path Optimization Tuning**: Extensive testing was done to refine the scoring and time estimation functions within the greedy algorithm, balancing speed and accuracy.
- **UART Tuning for Reliability**: Initial UART implementations faced challenges with data consistency, which was resolved through COBS encoding and tailored baud rate settings.

---

### Future Improvements

- **Machine Learning for Word Prediction**: Implement ML models to predict high-scoring words based on past inputs and prioritize them dynamically.
- **Real-Time Feedback Analysis**: Integrate real-time feedback for input accuracy, adjusting path planning based on any deviation in robot movements.
- **Advanced Parallel Processing**: Expand parallel processing capabilities for DFS and Trie processing to further speed up word discovery in large grids.

### Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Build Project**:
   ```bash
   npm run build
   ```
3. **Build the Trie**:
   ```bash
   npm run build-trie
   ```
4. **Run the Solver**:
   ```bash
   npm start
   ```

5. **Connect the Robot via Serial**:
   Ensure your robotic interface is connected and powered. Use the web interface to initiate commands and monitor real-time status.

