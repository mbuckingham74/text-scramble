const dictionary = require('./dictionary');
const {
  MIN_WORD_LENGTH,
  LEVEL_THRESHOLDS,
  getLetterCountForLevel,
  MAX_WORDS_PER_LENGTH
} = require('../../shared/constants');

// Puzzle words organized by length for progressive difficulty
// Each list is deduped by letter signature to ensure uniform puzzle variety
// (anagrams like LISTEN/SILENT share the same signature, so only one is kept)

// 6-letter words (levels 1-5) - 64 unique signatures
const puzzleWords6 = [
  'ALMOST', 'BASKET', 'CASTLE', 'DANGER', 'EAGLES', 'FABRIC', 'HANDLE',
  'ISLAND', 'JANGLE', 'KISMET', 'LAMENT', 'MANGLE', 'NACHOS', 'OBTUSE', 'PALACE',
  'QUARTS', 'RAISIN', 'SAILOR', 'TABLES', 'UNSAFE', 'VALISE', 'WALNUT', 'YANKED',
  'ZEALOT', 'BRANCH', 'CLAMPS', 'DREAMS', 'ELFINS', 'FLAUNT', 'GRAINS', 'HASTEN',
  'INSERT', 'JOINTS', 'KELVIN', 'LOATHE', 'NOSIER', 'OPERAS', 'PLANET',
  'QUIVER', 'REASON', 'TANGLE', 'UNITES', 'VARIES', 'WASTER', 'YOGURT',
  'STRIPE', 'MASTER', 'LISTEN', 'HEARTS', 'TRADES', 'BREAST',
  'CASTER', 'CREATE', 'ORIENT', 'LASTED', 'PETALS', 'ALERTS',
  'RENTAL', 'MERITS', 'STRIDE', 'CARIES', 'SATIRE', 'ARIOSE', 'SORTIE'
];

// 7-letter words (levels 6-10) - 58 unique signatures
const puzzleWords7 = [
  'ALMONDS', 'ASTRIDE', 'BANTERS', 'BLASTER', 'CABINET', 'CARPETS', 'COASTER',
  'CREDITS', 'DANCERS', 'DETAINS', 'DRASTIC', 'EASTERN', 'ELASTIC',
  'ENTRAPS', 'ESCAPED', 'FAINTED', 'FLOATER', 'GARDENS', 'GRANITE', 'HALTERS',
  'HASTIER', 'HEALING', 'LANTERN', 'LATRINE', 'LEADING',
  'LOADING', 'MARVELS', 'MARSHAL', 'MASTERS', 'MATCHER', 'NASTIER',
  'ORDAINS', 'PAINTER', 'PATROLS', 'PLASTER', 'PLANTED', 'PRATTLE', 'RATIONS',
  'READING', 'RECITAL', 'REMAINS', 'REPLANT', 'SALTIER',
  'SEATING', 'SHOUTED', 'SLACKER', 'SLANDER', 'SNORTED', 'SPATULA',
  'STACKER', 'STEWARD', 'STORAGE', 'STRANGE',
  'THREADS', 'TOASTED', 'TREASON', 'TRIPLED', 'TRUSTED'
];

// 8-letter words (levels 11+) - 45 unique signatures
const puzzleWords8 = [
  'ADMIRALS', 'ASTEROID', 'BANISTER', 'CHAPTERS',
  'CITADELS', 'CLIMATES', 'COASTERS', 'EASTWARD', 'ENTRAILS', 'FINAGLED',
  'FLOATING', 'GRADIENT', 'GRANITES', 'GYRATION', 'HAIRIEST', 'HANDLING',
  'HASTENED', 'LANTERNS', 'MALTSTER', 'MASTERED', 'MEDIATOR',
  'MIGRANTS', 'PAINTERS', 'PARTINGS', 'PASTURED', 'PLASTERS', 'REACTING',
  'READOUTS', 'REDCOATS', 'REPLANTS', 'RETAINED', 'ROUNDEST',
  'SALARIED', 'SCANTIER', 'SEDATION', 'SLANDERS', 'SMELTING', 'STAMPEDE',
  'STEADING', 'STRAINED', 'STRANGLE', 'THATCHES', 'TOASTING',
  'TREASONS', 'TRIANGLE'
];

// Get letter signature for cache key (sorted uppercase letters)
function getLetterSignature(letters) {
  if (Array.isArray(letters)) {
    return letters.map(l => l.toUpperCase()).sort().join('');
  }
  return letters.toUpperCase().split('').sort().join('');
}

// Precompute valid words for all puzzle words at startup
// This avoids scanning 30K dictionary words on every request
const puzzleCache = new Map();

function computeValidWords(letters) {
  const letterArr = letters.toUpperCase().split('');
  const validWords = [];

  dictionary.forEach(word => {
    if (word.length >= MIN_WORD_LENGTH && word.length <= letterArr.length) {
      if (canFormWord(word, letterArr)) {
        validWords.push(word);
      }
    }
  });

  return validWords.sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });
}

// All puzzle words combined for caching
const allPuzzleWords = [...puzzleWords6, ...puzzleWords7, ...puzzleWords8];

// Build cache at startup
(function initCache() {
  const startTime = Date.now();
  const seen = new Set();

  for (const word of allPuzzleWords) {
    const sig = getLetterSignature(word);
    if (!seen.has(sig)) {
      seen.add(sig);
      puzzleCache.set(sig, computeValidWords(word));
    }
  }

  console.log(`Puzzle cache built: ${puzzleCache.size} unique signatures in ${Date.now() - startTime}ms`);
})();

function generatePuzzle(level = 1) {
  // Select word list based on level using shared constants
  const targetLength = getLetterCountForLevel(level);
  let wordList;
  if (targetLength === LEVEL_THRESHOLDS.SIX_LETTERS.letterCount) {
    wordList = puzzleWords6;
  } else if (targetLength === LEVEL_THRESHOLDS.SEVEN_LETTERS.letterCount) {
    wordList = puzzleWords7;
  } else {
    wordList = puzzleWords8;
  }

  // Pick a random puzzle word from the appropriate list
  const baseWord = wordList[Math.floor(Math.random() * wordList.length)];
  const letters = baseWord.split('');

  // Shuffle the letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  // Get valid words from cache (or compute if somehow missing)
  const sig = getLetterSignature(letters);
  const validWords = puzzleCache.get(sig) || computeValidWords(letters.join(''));

  // Group by length
  const wordsByLength = {};
  validWords.forEach(word => {
    const len = word.length;
    if (!wordsByLength[len]) wordsByLength[len] = [];
    wordsByLength[len].push(word);
  });

  // Sort each group alphabetically, then cap at MAX_WORDS_PER_LENGTH words per length
  let cappedTotalWords = 0;
  Object.keys(wordsByLength).forEach(len => {
    wordsByLength[len].sort();
    wordsByLength[len] = wordsByLength[len].slice(0, MAX_WORDS_PER_LENGTH);
    cappedTotalWords += wordsByLength[len].length;
  });

  return {
    letters: letters,
    totalWords: cappedTotalWords,
    wordsByLength: wordsByLength,
    hasFullWord: validWords.some(w => w.length === targetLength)
  };
}

function validateWord(word, letters) {
  word = word.toUpperCase();

  // Must be at least MIN_WORD_LENGTH letters
  if (word.length < MIN_WORD_LENGTH) return false;

  // Check if word can be formed from available letters
  const availableLetters = [...letters.map(l => l.toUpperCase())];
  for (const char of word) {
    const index = availableLetters.indexOf(char);
    if (index === -1) return false;
    availableLetters.splice(index, 1);
  }

  // Check if it's a valid English word
  return dictionary.has(word);
}

function getAllValidWords(letters) {
  // Check cache first (covers all puzzle words)
  const sig = getLetterSignature(letters);
  const cached = puzzleCache.get(sig);
  if (cached) {
    return cached;
  }

  // Fallback to computation for non-cached letter combinations
  return computeValidWords(letters);
}

function canFormWord(word, letters) {
  const available = [...letters];
  for (const char of word) {
    const index = available.indexOf(char);
    if (index === -1) return false;
    available.splice(index, 1);
  }
  return true;
}

module.exports = {
  generatePuzzle,
  validateWord,
  getAllValidWords,
  // Exported for testing
  puzzleWords6,
  puzzleWords7,
  puzzleWords8
};
