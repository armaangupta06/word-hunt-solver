// TrieNode represents a single node in the Trie
export class TrieNode {
    constructor() {
        this.children = {}; // Dictionary to hold child nodes
        this.isEndOfWord = false; // Flag to check if the node represents the end of a word
    }
}

// Trie represents the Trie data structure
export class Trie {
    constructor() {
        this.root = new TrieNode(); // Root node of the Trie
    }

    /**
     * Inserts a word into the Trie.
     * @param {string} word - The word to be inserted.
     */
    insert(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode(); // Create a new node if the character doesn't exist
            }
            node = node.children[char]; // Move to the child node
        }
        node.isEndOfWord = true; // Mark the end of the word
    }

    /**
     * Searches for a word in the Trie.
     * @param {string} word - The word to be searched.
     * @returns {boolean} - Returns true if the word is found, otherwise false.
     */
    search(word) {
        let node = this.root;
        for (const char of word) {
            if (!node.children[char]) {
                return false; // Return false if the character is not found
            }
            node = node.children[char]; // Move to the child node
        }
        return node.isEndOfWord; // Return true if it's the end of a word, otherwise false
    }
}
