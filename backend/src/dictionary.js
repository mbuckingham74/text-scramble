const fs = require('fs');
const path = require('path');

// Load dictionary from words.txt file
const wordsPath = path.join(__dirname, 'words.txt');
const wordList = fs.readFileSync(wordsPath, 'utf-8')
  .split('\n')
  .map(word => word.trim())
  // Filter: 3-8 letters, only lowercase words (excludes proper nouns)
  .filter(word => word.length >= 3 && word.length <= 8 && /^[a-z]+$/.test(word))
  .map(word => word.toUpperCase());

const dictionary = new Set(wordList);

if (process.env.NODE_ENV !== 'production') {
  console.log(`Dictionary loaded: ${dictionary.size} words`);
}

module.exports = dictionary;
