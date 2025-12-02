const dictionary = require('./dictionary');

// 6-letter words that have many sub-words (good for puzzles)
const puzzleWords = [
  'ALMOST', 'BASKET', 'CASTLE', 'DANGER', 'EAGLES', 'FABRIC', 'GARDEN', 'HANDLE',
  'ISLAND', 'JANGLE', 'KISMET', 'LAMENT', 'MANGLE', 'NACHOS', 'OBTUSE', 'PALACE',
  'QUARTS', 'RAISIN', 'SAILOR', 'TABLES', 'UNSAFE', 'VALISE', 'WALNUT', 'YANKED',
  'ZEALOT', 'BRANCH', 'CLAMPS', 'DREAMS', 'ELFINS', 'FLAUNT', 'GRAINS', 'HASTEN',
  'INSERT', 'JOINTS', 'KELVIN', 'LOATHE', 'MENTAL', 'NOSIER', 'OPERAS', 'PLANET',
  'QUIVER', 'REASON', 'SENIOR', 'TANGLE', 'UNITES', 'VARIES', 'WASTER', 'YOGURT',
  'STRIPE', 'MASTER', 'STREAM', 'LISTEN', 'SILENT', 'HEARTS', 'SHEART', 'TRADES',
  'STARED', 'BASTER', 'BREAST', 'CARETS', 'CASTER', 'RECAST', 'TRACES', 'CREATE',
  'SINTER', 'TONIER', 'ORIENT', 'SENIOR', 'DATERS', 'TREADS', 'LASTED', 'SALTED',
  'SLATED', 'STALED', 'DELTAS', 'PASTEL', 'PETALS', 'PLATES', 'PLEATS', 'STAPLE',
  'PALEST', 'ALERTS', 'ALTERS', 'ARTELS', 'ESTRAL', 'LASTER', 'RATELS', 'SALTER',
  'SLATER', 'STALER', 'STELAR', 'TALERS', 'ANTLER', 'LEARNT', 'RENTAL', 'ESPRIT',
  'PRIEST', 'RIPEST', 'SPRITE', 'STRIPE', 'TRIPES', 'REMITS', 'MERITS', 'MISTER',
  'MITERS', 'MITRES', 'SMITER', 'TIMERS', 'DIREST', 'DRIEST', 'STRIDE', 'CARIES',
  'CERIAS', 'ERICAS', 'SATIRE', 'STRIAE', 'TERAIS', 'AIREST', 'ARIOSE', 'SORTIE'
];

function generatePuzzle() {
  // Pick a random puzzle word
  const baseWord = puzzleWords[Math.floor(Math.random() * puzzleWords.length)];
  const letters = baseWord.split('');

  // Shuffle the letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  // Find all valid words
  const validWords = getAllValidWords(letters.join(''));

  // Group by length
  const wordsByLength = {};
  validWords.forEach(word => {
    const len = word.length;
    if (!wordsByLength[len]) wordsByLength[len] = [];
    wordsByLength[len].push(word);
  });

  // Sort each group alphabetically
  Object.keys(wordsByLength).forEach(len => {
    wordsByLength[len].sort();
  });

  return {
    letters: letters,
    totalWords: validWords.length,
    wordsByLength: wordsByLength,
    hasFullWord: validWords.some(w => w.length === 6)
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
  const letterArr = letters.toUpperCase().split('');
  const validWords = [];

  // Check each word in dictionary
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
