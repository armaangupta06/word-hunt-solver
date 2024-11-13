// src/views/wordSearchView.js
import { getState } from '../state/store.js';

export const renderWordSearchGrid = (container, grid) => {
    // Clear the container
    container.innerHTML = '';

    // Generate HTML for the grid
    grid.forEach((row, rowIndex) => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('grid-row');

        row.forEach((cell, cellIndex) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('grid-cell');
            cellElement.innerText = cell;
            cellElement.dataset.row = rowIndex;
            cellElement.dataset.col = cellIndex;
            cellElement.id = `cell-${rowIndex}-${cellIndex}`;

            // Attach event listeners if necessary
            cellElement.addEventListener('click', (event) => {
                handleCellClick(event, rowIndex, cellIndex);
            });

            rowElement.appendChild(cellElement);
        });

        container.appendChild(rowElement);
    });

    // Ensure SVG overlay exists
    if (!document.getElementById('linesOverlay')) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'linesOverlay';
        container.appendChild(svg);
    }
};

export const updateFoundWords = (foundWords) => {
    const foundWordsContainer = document.getElementById('foundWordsContainer');
    foundWordsContainer.innerHTML = '';

    foundWords.forEach((wordObj) => {
        const wordElement = document.createElement('div');
        wordElement.classList.add('found-word');
        wordElement.innerText = wordObj.word;

        // Store positions and score as data attributes
        wordElement.dataset.positions = JSON.stringify(wordObj.positions);
        wordElement.dataset.score = wordObj.score;

        // Attach event listeners for hover effects
        wordElement.addEventListener('mouseover', handleWordHover);
        wordElement.addEventListener('mouseout', handleWordHoverOut);

        foundWordsContainer.appendChild(wordElement);
    });
};

// Expose highlight functions for programmatic use
export const highlightWord = (wordObj) => {
    const foundWordsContainer = document.getElementById('foundWordsContainer');
    const wordElements = Array.from(foundWordsContainer.getElementsByClassName('found-word'));

    // Find the word element matching the wordObj.word
    const wordElement = wordElements.find(el => el.innerText === wordObj.word);

    if (wordElement) {
        // Add 'highlighted' class to the word
        wordElement.classList.add('highlighted');
        
        wordElement.scrollIntoView({
            behavior: 'smooth', // Smooth scrolling
            block: 'center',   // Aligns the element's nearest edge to the visible area
            inline: 'start'     // Aligns the element's inline start edge to the visible area
        });
        // Highlight corresponding grid cells
        const positions = wordObj.positions;
        positions.forEach(pos => {
            const cell = document.getElementById(`cell-${pos.x}-${pos.y}`);
            if (cell) {
                cell.classList.add('highlight');
            }
        });

        // Draw connecting lines
        drawConnectingLines(positions);
    }
};

export const unhighlightWord = (wordObj) => {
    const foundWordsContainer = document.getElementById('foundWordsContainer');
    const wordElements = Array.from(foundWordsContainer.getElementsByClassName('found-word'));

    // Find the word element matching the wordObj.word
    const wordElement = wordElements.find(el => el.innerText === wordObj.word);

    if (wordElement) {
        // Remove 'highlighted' class from the word
        wordElement.classList.remove('highlighted');

        // Unhighlight corresponding grid cells
        const positions = wordObj.positions;
        positions.forEach(pos => {
            const cell = document.getElementById(`cell-${pos.x}-${pos.y}`);
            if (cell) {
                cell.classList.remove('highlight');
            }
        });

        // Remove connecting lines
        removeConnectingLines();
    }
};

// Event handler functions
const handleWordHover = (event) => {
    const wordElement = event.currentTarget;
    const positions = JSON.parse(wordElement.dataset.positions);
    // Remove highlight from all cells
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.classList.remove('highlight');
    });
    // Highlight corresponding grid cells
    positions.forEach(pos => {
        const cell = document.getElementById(`cell-${pos.x}-${pos.y}`);
        if (cell) {
            cell.classList.add('highlight');
        }
    });

    // Draw connecting lines
    drawConnectingLines(positions);
};

const handleWordHoverOut = (event) => {
    const wordElement = event.currentTarget;
    const positions = JSON.parse(wordElement.dataset.positions);

    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.classList.remove('highlight');
    });

    // Remove connecting lines
    removeConnectingLines();
    const { selectedWords } = getState();
    highlightWords(selectedWords, document.getElementById('gridContainer'));
};

const drawConnectingLines = (positions) => {
    const svg = document.getElementById('linesOverlay');
    svg.innerHTML = ''; // Clear previous lines

    for (let i = 0; i < positions.length - 1; i++) {
        const pos1 = positions[i];
        const pos2 = positions[i + 1];

        const cell1 = document.getElementById(`cell-${pos1.x}-${pos1.y}`);
        const cell2 = document.getElementById(`cell-${pos2.x}-${pos2.y}`);

        if (cell1 && cell2) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

            const rect1 = cell1.getBoundingClientRect();
            const rect2 = cell2.getBoundingClientRect();

            // Calculate positions relative to SVG
            const containerRect = svg.getBoundingClientRect();

            const x1 = rect1.left + rect1.width / 2 - containerRect.left;
            const y1 = rect1.top + rect1.height / 2 - containerRect.top;
            const x2 = rect2.left + rect2.width / 2 - containerRect.left;
            const y2 = rect2.top + rect2.height / 2 - containerRect.top;

            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#ff5722'); // Line color
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-linecap', 'round');

            svg.appendChild(line);
        }
    }
};

const removeConnectingLines = () => {
    const svg = document.getElementById('linesOverlay');
    svg.innerHTML = '';
};

// Optional: Highlight found words on the grid
export const highlightWords = (selectedWords, gridContainer) => {
    selectedWords.forEach((wordObj) => {
        wordObj.positions.forEach((pos) => {
            const cell = gridContainer.querySelector(`[data-row="${pos.x}"][data-col="${pos.y}"]`);
            if (cell) {
                cell.classList.add('highlight');
            }
        });
    });
};

// Placeholder for cell click handler
const handleCellClick = (event, row, col) => {
    // Implement logic to handle cell selection if needed
};
