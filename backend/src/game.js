const dictionary = require('./dictionary');

// Puzzle words organized by length for progressive difficulty
// 6-letter words (levels 1-5)
const puzzleWords6 = [
  'ALMOST', 'BASKET', 'CASTLE', 'DANGER', 'EAGLES', 'FABRIC', 'GARDEN', 'HANDLE',
  'ISLAND', 'JANGLE', 'KISMET', 'LAMENT', 'MANGLE', 'NACHOS', 'OBTUSE', 'PALACE',
  'QUARTS', 'RAISIN', 'SAILOR', 'TABLES', 'UNSAFE', 'VALISE', 'WALNUT', 'YANKED',
  'ZEALOT', 'BRANCH', 'CLAMPS', 'DREAMS', 'ELFINS', 'FLAUNT', 'GRAINS', 'HASTEN',
  'INSERT', 'JOINTS', 'KELVIN', 'LOATHE', 'MENTAL', 'NOSIER', 'OPERAS', 'PLANET',
  'QUIVER', 'REASON', 'SENIOR', 'TANGLE', 'UNITES', 'VARIES', 'WASTER', 'YOGURT',
  'STRIPE', 'MASTER', 'STREAM', 'LISTEN', 'SILENT', 'HEARTS', 'TRADES', 'STARED',
  'BASTER', 'BREAST', 'CARETS', 'CASTER', 'RECAST', 'TRACES', 'CREATE', 'SINTER',
  'TONIER', 'ORIENT', 'DATERS', 'TREADS', 'LASTED', 'SALTED', 'SLATED', 'STALED',
  'DELTAS', 'PASTEL', 'PETALS', 'PLATES', 'PLEATS', 'STAPLE', 'PALEST', 'ALERTS',
  'ALTERS', 'ARTELS', 'ESTRAL', 'LASTER', 'RATELS', 'SALTER', 'SLATER', 'STALER',
  'STELAR', 'TALERS', 'ANTLER', 'LEARNT', 'RENTAL', 'ESPRIT', 'PRIEST', 'RIPEST',
  'SPRITE', 'TRIPES', 'REMITS', 'MERITS', 'MISTER', 'MITERS', 'MITRES', 'SMITER',
  'TIMERS', 'DIREST', 'DRIEST', 'STRIDE', 'CARIES', 'CERIAS', 'ERICAS', 'SATIRE',
  'STRIAE', 'TERAIS', 'AIREST', 'ARIOSE', 'SORTIE'
];

// 7-letter words (levels 6-10)
const puzzleWords7 = [
  'ALMONDS', 'ASTRIDE', 'BANTERS', 'BLASTER', 'CABINET', 'CARPETS', 'COASTER',
  'CREDITS', 'DAIMONS', 'DANCERS', 'DETAINS', 'DRASTIC', 'EASTERN', 'ELASTIC',
  'ENTRAPS', 'ESCAPED', 'FAINTED', 'FLOATER', 'GARDENS', 'GRANITE', 'HALTERS',
  'HASTIER', 'HEALING', 'INSTEAD', 'LANTERN', 'LATRINE', 'LEADING', 'LATHERS',
  'LOADING', 'MARVELS', 'MARSHAL', 'MASTERS', 'MATCHER', 'NASTIER', 'NEAREST',
  'ORDAINS', 'PAINTER', 'PATROLS', 'PLASTER', 'PLANTED', 'PRATTLE', 'RATIONS',
  'READING', 'RECITAL', 'RELIANT', 'REMAINS', 'REPLANT', 'RETAINS', 'SALTIER',
  'SEATING', 'SHOUTED', 'SLACKER', 'SLANDER', 'SLATHER', 'SNORTED', 'SPATULA',
  'STACKER', 'STAPLER', 'STEWARD', 'STORAGE', 'STRANGE', 'STREWN', 'TAILERS',
  'TEASING', 'THREADS', 'TOASTED', 'TREASON', 'TRIPLED', 'TRUSTED', 'WARTIER'
];

// 8-letter words (levels 11+)
const puzzleWords8 = [
  'ADMIRALS', 'ALERTING', 'ALTERING', 'ASTEROID', 'BANISTER', 'CHAPTERS', 'CHARIEST',
  'CITADELS', 'CLIMATES', 'COASTERS', 'CRANKEST', 'DANGLIER', 'DILATERS', 'DRAPIEST',
  'EASTWARD', 'ENTRAILS', 'ESTRAGON', 'FINAGLED', 'FLOATING', 'GALLERIES', 'GRADIENT',
  'GRANITES', 'GYRATION', 'HAIRIEST', 'HANDLING', 'HASTENED', 'HEIRDOMS', 'HORNIEST',
  'INSTALRD', 'LANTERNS', 'LATRINES', 'LEADINGS', 'LEASTING', 'LOATHERS', 'MALTSTER',
  'MARQUEST', 'MASTERED', 'MEDIATOR', 'MENSTRUA', 'MIGRANTS', 'MISRATED', 'MOISTENED',
  'NACREOUS', 'PAINTERS', 'PARTINGS', 'PASTURED', 'PEDLARS', 'PLASTERED', 'PLASTERS',
  'PRAISETH', 'RADICLES', 'REACTING', 'READOUTS', 'REDCOATS', 'RELATING', 'REPLANTS',
  'RESALTED', 'RETAINED', 'ROUNDEST', 'SALARIED', 'SAUTEING', 'SCANTIER', 'SEDATION',
  'SIDEREAL', 'SLANDERS', 'SMELTING', 'STAMPEDE', 'STEADING', 'STRAINED', 'STRANGLE',
  'STREAMED', 'TANGIERS', 'THATCHES', 'TOASTING', 'TREASONS', 'TRIANGLE', 'WRASTLED'
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
    if (word.length >= 3 && word.length <= letterArr.length) {
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
  // Select word list based on level:
  // Levels 1-5: 6 letters
  // Levels 6-10: 7 letters
  // Levels 11+: 8 letters
  let wordList;
  let targetLength;
  if (level <= 5) {
    wordList = puzzleWords6;
    targetLength = 6;
  } else if (level <= 10) {
    wordList = puzzleWords7;
    targetLength = 7;
  } else {
    wordList = puzzleWords8;
    targetLength = 8;
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

  // Sort each group alphabetically, then cap at 12 words per length
  const MAX_WORDS_PER_LENGTH = 12;
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

  // Must be at least 3 letters
  if (word.length < 3) return false;

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

module.exports = { generatePuzzle, validateWord, getAllValidWords };
