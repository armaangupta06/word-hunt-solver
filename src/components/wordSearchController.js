import { setState, getState, subscribe } from '../state/store.js';
import { findWordsInGrid } from '../algorithms/solver.js';
import { optimizeWords } from '../algorithms/optimizer.js';
import { renderWordSearchGrid, updateFoundWords, highlightWords, highlightWord, unhighlightWord } from '../views/wordSearchView.js';
import { Trie, TrieNode } from '../algorithms/trie/trieBuilder.js';
import { generatePath } from '../algorithms/pathGenerator.js';

let trie = null;

// Utility function for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initializes the word search controller.
 */
export const initWordSearchController = () => {
    const generateButton = document.getElementById('generateButton');
    const gridContainer = document.getElementById('gridContainer');
    const solvePuzzleButton = document.getElementById('solveButton');

    generateButton.addEventListener('click', handleGenerateClick);

    // Load the trie when the controller initializes
    loadTrie();

    // Subscribe to state changes if needed
    subscribe((state) => {
        if (state.wordSearchGrid) {
            renderWordSearchGrid(gridContainer, state.wordSearchGrid);
        }
        if (state.selectedWords) {
            updateFoundWords(state.selectedWords);
            highlightWords(state.selectedWords, gridContainer);

            if (state.connected && state.selectedWords) {
                solvePuzzleButton.disabled = false;
            }
        }
    });

    solvePuzzleButton.addEventListener('click', handleSolveClick);
};

/**
 * Loads the trie from a JSON file.
 */
const loadTrie = async () => {
    try {
        const response = await fetch('/trie.json');
        const serializedTrie = await response.json();
        trie = restoreTrie(serializedTrie);
        console.log('Trie loaded successfully.');
    } catch (error) {
        console.error('Failed to load trie:', error);
        alert('Failed to load trie. Please refresh the page or try again later.');
    }
};

/**
 * Restores a trie from its serialized form.
 * @param {Object} serializedTrie - The serialized trie.
 * @returns {Trie} - The restored trie.
 */
function restoreTrie(serializedTrie) {
    class TrieNode {
        constructor() {
            this.children = {};
            this.isEndOfWord = false;
        }
    }

    const trieInstance = new Trie();
    trieInstance.root = restoreNode(serializedTrie.root);
    return trieInstance;
}

/**
 * Recursively restores a trie node from its serialized form.
 * @param {Object} nodeData - The serialized node data.
 * @returns {TrieNode} - The restored trie node.
 */
function restoreNode(nodeData) {
    const node = new TrieNode();
    node.isEndOfWord = nodeData.isEndOfWord;
    node.children = {};
    for (const [char, childData] of Object.entries(nodeData.children)) {
        node.children[char] = restoreNode(childData);
    }
    return node;
}

/**
 * Draws a word on the grid using the haxidraw machine.
 * @param {Object} wordObj - The word object containing the word and its positions.
 */
export const drawWord = async (wordObj) => {
    const { haxidraw } = getState();

    if (!haxidraw) {
        alert('Machine is not connected. Please connect first.');
        return;
    }

    // Generate machine coordinates path
    console.log("PATH");
    const path = generatePath(wordObj.positions);
   
    console.log(path);
    try {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('highlight');
        });
        // Highlight the word as if it's being hovered
        highlightWord(wordObj);

        // Get first element of path and remove it from the path, and go to that point.
        const firstPoint = path.shift();
        await haxidraw.goTo(firstPoint.x, firstPoint.y); // Move to the starting point

        // Lower the pen
        await haxidraw.servo(1700); // Pen down
        await delay(50); // Optional: Wait for pen to lower
        // Draw the path
        await haxidraw.drawPath(path);
         // Optional: Wait after drawing

        // Raise the pen
        await haxidraw.servo(1000); // Pen up
        await delay(110); // Optional: Wait for pen to raise

        console.log(`Finished drawing word: ${wordObj.word}`);
    } catch (error) {
        console.error(`Error drawing word "${wordObj.word}":`, error);
        alert(`Failed to draw the word "${wordObj.word}". Please try again.`);

        // Hide drawing status if necessary
        const drawingStatus = document.getElementById('drawingStatus');
        if (drawingStatus) {
            drawingStatus.classList.remove('visible');
        }
    } finally {
        // Unhighlight the word after drawing
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('highlight');
        });
        unhighlightWord(wordObj);
    }
};

/**
 * Updates the score display based on the found words.
 * @param {Array} foundWords - The array of found word objects.
 */
const updateScoreDisplay = (foundWords) => {
    const estimatedScoreElement = document.getElementById('estimatedScore');
    let totalScore = 0;

    foundWords.forEach(wordObj => {
        totalScore += wordObj.score * 100;
    });

    estimatedScoreElement.textContent = totalScore;
};

/**
 * Handles the click event for the generate button.
 */
const handleGenerateClick = () => {
    const grid = getWordsFromInput(); // Implement this function to retrieve user input

    if (!trie) {
        alert('Trie is not loaded yet. Please try again shortly.');
        return;
    }

    const foundWords = findWordsInGrid(grid, trie);
    const optimizedWords = optimizeWords(foundWords);

    setState({ wordSearchGrid: grid, selectedWords: optimizedWords });

    // Update the score when new words are found
    updateScoreDisplay(optimizedWords);
};

/**
 * Helper function to get user input and convert it to a grid.
 * @returns {Array} - The grid of words.
 */
const getWordsFromInput = () => {
    const wordsInput = document.getElementById('wordsInput').value;
    return wordsInput.split(' ').map((row) => row.split(''));
};

/**
 * Handles the click event for the solve button.
 */
const handleSolveClick = async () => {
    console.log("Starting drawing process...");
    const { selectedWords } = getState();
    let totalTime = 0;
    let totalScore = 0;
    let startTime = performance.now();
    for (const wordObj of selectedWords) {
        try {
            // Record current actual time
            const wordStartTime = performance.now();
            await drawWord(wordObj);
            const endTime = performance.now();
            const actualWordTime = endTime - wordStartTime;
            const actualTotalTime = endTime - startTime;
            totalTime += wordObj.totalTime;
            console.log(endTime, startTime, wordStartTime);
            console.log(`Theoretical total time so far: ${totalTime}`);
            console.log(`Actual total time so far: ${actualTotalTime / 1000}`);
            console.log(`Theoretical Time taken for "${wordObj.word}": ${wordObj.totalTime}`);
            console.log(`Actual time taken for "${wordObj.word}": ${actualWordTime / 1000}`);
            
            totalScore += wordObj.score * 100;
            console.log(`Total score so far: ${totalScore}`);
            // Optional: Add delay between words
        } catch (error) {
            console.error(`Failed to draw word "${wordObj.word}":`, error);
            // Decide whether to continue or halt
            continue;
        }
    }

    console.log("Drawing process completed.");
};
