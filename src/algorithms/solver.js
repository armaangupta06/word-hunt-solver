import { Trie } from './trie/trieBuilder.js';

// Exported function to find words in the grid
export const findWordsInGrid = (grid, trie) => {
    const ROWS = grid.length; // Number of rows in the grid
    const COLS = grid[0].length; // Number of columns in the grid

    // Directions for adjacent cells (8-connected grid)
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0,  -1],          [0,  1],
        [1,  -1], [1,  0], [1,  1],
    ];

    const foundWords = []; // Array to store found word objects

    /**
     * Depth-First Search (DFS) helper function to explore the grid
     * @param {number} x - Current row index
     * @param {number} y - Current column index
     * @param {object} node - Current trie node
     * @param {string} path - Current word path
     * @param {Array} visited - 2D array to track visited cells
     * @param {Array} positions - Array to store positions of the current word
     */
    const dfs = (x, y, node, path, visited, positions) => {
        // Boundary checks
        if (x < 0 || y < 0 || x >= ROWS || y >= COLS) return;
        if (visited[x][y]) return;

        const char = grid[x][y].toLowerCase(); // Get the character at the current cell

        if (!node.children[char]) return; // Prune path if char not in trie

        visited[x][y] = true; // Mark the cell as visited
        node = node.children[char]; // Move to the next trie node
        path += char; // Append the character to the current path
        positions.push({ x, y }); // Store the position

        // If the current node marks the end of a word, add the word to foundWords
        if (node.isEndOfWord) {
            foundWords.push({
                word: path,
                positions: [...positions], // Clone positions array
            });
        }

        // Explore all 8 possible directions
        for (const [dx, dy] of directions) {
            dfs(x + dx, y + dy, node, path, visited, positions);
        }

        visited[x][y] = false; // Backtrack: unmark the cell as visited
        positions.pop(); // Remove the last position
    };

    // Start DFS from each cell in the grid
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false)); // Initialize visited array
            dfs(i, j, trie.root, '', visited, []); // Start DFS from the current cell
        }
    }

    return foundWords; // Return the list of found words
};
