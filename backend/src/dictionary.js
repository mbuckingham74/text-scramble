const fs = require('fs');
const path = require('path');

// Load dictionary from words.txt file
const wordsPath = path.join(__dirname, 'words.txt');
const wordList = fs.readFileSync(wordsPath, 'utf-8')
  .split('\n')
  .map(word => word.trim().toUpperCase())
  .filter(word => word.length >= 3 && word.length <= 6 && /^[A-Z]+$/.test(word));

const dictionary = new Set(wordList);

if (process.env.NODE_ENV !== 'production') {
  console.log(`Dictionary loaded: ${dictionary.size} words`);
}

module.exports = dictionary;
