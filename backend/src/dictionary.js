const fs = require('fs');
const path = require('path');
const { MIN_WORD_LENGTH, MAX_WORD_LENGTH } = require('./constants');

// Load dictionary from words.txt file
const wordsPath = path.join(__dirname, 'words.txt');
const wordList = fs.readFileSync(wordsPath, 'utf-8')
  .split('\n')
  .map(word => word.trim())
  // Filter by constants, only lowercase words (excludes proper nouns)
  .filter(word => word.length >= MIN_WORD_LENGTH && word.length <= MAX_WORD_LENGTH && /^[a-z]+$/.test(word))
  .map(word => word.toUpperCase());

const dictionary = new Set(wordList);

if (process.env.NODE_ENV !== 'production') {
  console.log(`Dictionary loaded: ${dictionary.size} words`);
}

module.exports = dictionary;
