import { getState, setState } from '../state/store.js';

const movementSpeed = 12.5; // units per second (number of tiles per second -> calculate by 12500/speed)
const timeLimit = 90; // total time limit in seconds

alpha = 1;
beta = 1;

/**
 * Function to calculate distance that motors must travel.
 * @param {Object} pos1 - The starting position with x and y coordinates.
 * @param {Object} pos2 - The ending position with x and y coordinates.
 * @returns {number} - The calculated distance.
 */
const distance = (pos1, pos2) => {
    // Return the max of x + y and x - y
    return Math.max(Math.abs(pos2.x + pos2.y - (pos1.x + pos1.y)), Math.abs(pos2.x - pos2.y - (pos1.x - pos1.y)));
};

/**
 * Function to calculate the score of a word based on its length.
 * @param {number} length - The length of the word.
 * @returns {number} - The score of the word.
 */
const getWordScore = (length) => {
    if (length === 3) return 1;
    if (length === 4) return 4;
    if (length === 5) return 8;
    if (length === 6) return 14;
    if (length === 7) return 18;
    return 22; // 8 letters or more
};

/**
 * Function to optimize the selection of words based on their scores and the time required to input them.
 * @param {Array} foundWords - The list of found words with their positions.
 * @returns {Array} - The list of selected words optimized for score and input time.
 */
export const optimizeWords = (foundWords) => {
    // Process found words
    const wordsList = foundWords.map((wordObj) => {
        const word = wordObj.word.toLowerCase();
        const positions = wordObj.positions;
        const startPos = positions[0];
        const endPos = positions[positions.length - 1];
        const score = getWordScore(word.length);

        let totalDistance = 0;
        for (let i = 1; i < positions.length; i++) {
            totalDistance += distance(positions[i - 1], positions[i]);
        }

        const inputTime = totalDistance / movementSpeed;

        return {
            word,
            positions,
            startPos,
            endPos,
            inputTime,
            score,
            distance: totalDistance,
        };
    });

    // Starting position (e.g., center of the grid or robot's starting position)
    let currentPosition = { x: 0, y: 0 }; // Adjust as needed for your grid
    let totalTime = 0;
    const selectedWords = [];
    let remainingWords = [...wordsList];
    
    while (totalTime < timeLimit && remainingWords.length > 0) {
        // Recalculate efficiency scores based on the current position
        remainingWords.forEach((wordObj) => {
            const movementTime = 0.19 + distance(currentPosition, wordObj.startPos) / movementSpeed;
            const totalTimeForWord = wordObj.inputTime + movementTime;
            wordObj.efficiencyScore = Math.pow(wordObj.score, alpha) / Math.pow(totalTimeForWord, beta);
            wordObj.totalTime = totalTimeForWord;
            wordObj.movementTime = movementTime;
        });

        // Sort words by efficiency score in descending order
        remainingWords.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

        // Select the word with the highest efficiency score
        const nextWord = remainingWords.shift();

        // Check if adding this word exceeds the time limit
        if (totalTime + nextWord.totalTime > timeLimit) {
            continue; // Skip this word and proceed to the next one
        }

        // Add the word to the selected list
        selectedWords.push(nextWord);
        totalTime += nextWord.totalTime;
        currentPosition = nextWord.endPos;

        // Remove the selected word from the remaining words
        remainingWords = remainingWords.filter((word) => word.word !== nextWord.word);
    }
    console.log(selectedWords.reduce((sum, word) => sum + word.score * 100, 0));
    return selectedWords;
};
