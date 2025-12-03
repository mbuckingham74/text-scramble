// Gameplay constants
// These match the backend shared/constants.js values

// Timer settings (in seconds)
export const TIMER_DURATION = 120;
export const TIMER_WARNING_THRESHOLD = 30;
export const TIMER_CRITICAL_THRESHOLD = 10;

// Word validation
export const MIN_WORD_LENGTH = 3;

// Scoring: points = (length * BASE) + ((length - MIN_WORD_LENGTH) * BONUS)
export const POINTS_PER_LETTER = 10;
export const BONUS_PER_EXTRA_LETTER = 5;

// Calculate points for a word
export function calculatePoints(wordLength) {
  return wordLength * POINTS_PER_LETTER + (wordLength - MIN_WORD_LENGTH) * BONUS_PER_EXTRA_LETTER;
}

// Level progression display (for menu instructions)
export const LEVEL_THRESHOLDS = {
  SIX_LETTERS: { maxLevel: 5, letterCount: 6 },
  SEVEN_LETTERS: { maxLevel: 10, letterCount: 7 },
  EIGHT_LETTERS: { maxLevel: Infinity, letterCount: 8 }
};
