import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Trie } from '../src/algorithms/trie/trieBuilder.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the path to the dictionary file
const dictionaryPath = path.join(__dirname, '../src/algorithms/trie/dictionary.txt');

// Read the dictionary file and split it into an array of words
const dictionary = fs.readFileSync(dictionaryPath, 'utf8').split('\n');

// Initialize a new Trie instance
const trie = new Trie();

// Insert words into the trie
for (let word of dictionary) {
    word = word.trim().toLowerCase();
    if (word.length > 2 && word.length <= 16) {
        trie.insert(word);
    }
}

// Serialize the trie to JSON format
const trieJSON = JSON.stringify(trie);

// Define the output path for the serialized trie
const outputPath = path.join(__dirname, '../public/trie.json');

// Write the serialized trie to the output file
fs.writeFileSync(outputPath, trieJSON);

console.log('Trie has been built and saved to trie.json');
