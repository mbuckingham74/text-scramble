// Gameplay constants - backend is source of truth
// Frontend has a copy at frontend/src/constants.js that must be kept in sync

// Timer settings (in seconds)
const TIMER_DURATION = 120;
const TIMER_WARNING_THRESHOLD = 30;
const TIMER_CRITICAL_THRESHOLD = 10;

// Word validation
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 8; // Maximum puzzle size (8-letter words at level 11+)

// Scoring: points = (length * BASE) + ((length - MIN_WORD_LENGTH) * BONUS)
const POINTS_PER_LETTER = 10;
const BONUS_PER_EXTRA_LETTER = 5;

// Calculate points for a word
function calculatePoints(wordLength) {
  return wordLength * POINTS_PER_LETTER + (wordLength - MIN_WORD_LENGTH) * BONUS_PER_EXTRA_LETTER;
}

// Level progression thresholds
const LEVEL_THRESHOLDS = {
  SIX_LETTERS: { maxLevel: 5, letterCount: 6 },
  SEVEN_LETTERS: { maxLevel: 10, letterCount: 7 },
  EIGHT_LETTERS: { maxLevel: Infinity, letterCount: 8 }
};

// Get letter count for a given level
function getLetterCountForLevel(level) {
  if (level <= LEVEL_THRESHOLDS.SIX_LETTERS.maxLevel) {
    return LEVEL_THRESHOLDS.SIX_LETTERS.letterCount;
  }
  if (level <= LEVEL_THRESHOLDS.SEVEN_LETTERS.maxLevel) {
    return LEVEL_THRESHOLDS.SEVEN_LETTERS.letterCount;
  }
  return LEVEL_THRESHOLDS.EIGHT_LETTERS.letterCount;
}

// Puzzle display limits
const MAX_WORDS_PER_LENGTH = 12;

module.exports = {
  TIMER_DURATION,
  TIMER_WARNING_THRESHOLD,
  TIMER_CRITICAL_THRESHOLD,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
  POINTS_PER_LETTER,
  BONUS_PER_EXTRA_LETTER,
  calculatePoints,
  LEVEL_THRESHOLDS,
  getLetterCountForLevel,
  MAX_WORDS_PER_LENGTH
};
