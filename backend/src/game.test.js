/**
 * Tests for game.js - validation schemas and dictionary invariants
 * Run with: node src/game.test.js
 */

const assert = require('assert');
const dictionary = require('./dictionary');
const {
  generatePuzzle,
  validateWord,
  getAllValidWords,
  puzzleWords6,
  puzzleWords7,
  puzzleWords8
} = require('./game');

// Helper to get letter signature (sorted letters)
const getSignature = (word) => word.toUpperCase().split('').sort().join('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  ${err.message}`);
    failed++;
  }
}

console.log('Running game.js tests...\n');

// Test: All 6-letter puzzle words exist in dictionary
test('All 6-letter puzzle words exist in dictionary', () => {
  const missing = puzzleWords6.filter(w => !dictionary.has(w));
  assert.strictEqual(missing.length, 0, `Missing words: ${missing.join(', ')}`);
});

// Test: All 7-letter puzzle words exist in dictionary
test('All 7-letter puzzle words exist in dictionary', () => {
  const missing = puzzleWords7.filter(w => !dictionary.has(w));
  assert.strictEqual(missing.length, 0, `Missing words: ${missing.join(', ')}`);
});

// Test: All 8-letter puzzle words exist in dictionary
test('All 8-letter puzzle words exist in dictionary', () => {
  const missing = puzzleWords8.filter(w => !dictionary.has(w));
  assert.strictEqual(missing.length, 0, `Missing words: ${missing.join(', ')}`);
});

// Test: No duplicate signatures in 6-letter words
test('No duplicate signatures in 6-letter puzzle words', () => {
  const sigs = puzzleWords6.map(getSignature);
  const dupes = sigs.filter((s, i) => sigs.indexOf(s) !== i);
  assert.strictEqual(dupes.length, 0, `Duplicate signatures: ${dupes.join(', ')}`);
});

// Test: No duplicate signatures in 7-letter words
test('No duplicate signatures in 7-letter puzzle words', () => {
  const sigs = puzzleWords7.map(getSignature);
  const dupes = sigs.filter((s, i) => sigs.indexOf(s) !== i);
  assert.strictEqual(dupes.length, 0, `Duplicate signatures: ${dupes.join(', ')}`);
});

// Test: No duplicate signatures in 8-letter words
test('No duplicate signatures in 8-letter puzzle words', () => {
  const sigs = puzzleWords8.map(getSignature);
  const dupes = sigs.filter((s, i) => sigs.indexOf(s) !== i);
  assert.strictEqual(dupes.length, 0, `Duplicate signatures: ${dupes.join(', ')}`);
});

// Test: All puzzle words have correct length
test('All 6-letter puzzle words are 6 letters', () => {
  const wrong = puzzleWords6.filter(w => w.length !== 6);
  assert.strictEqual(wrong.length, 0, `Wrong length: ${wrong.join(', ')}`);
});

test('All 7-letter puzzle words are 7 letters', () => {
  const wrong = puzzleWords7.filter(w => w.length !== 7);
  assert.strictEqual(wrong.length, 0, `Wrong length: ${wrong.join(', ')}`);
});

test('All 8-letter puzzle words are 8 letters', () => {
  const wrong = puzzleWords8.filter(w => w.length !== 8);
  assert.strictEqual(wrong.length, 0, `Wrong length: ${wrong.join(', ')}`);
});

// Test: generatePuzzle returns correct structure for level 1 (6 letters)
test('generatePuzzle returns 6 letters for level 1', () => {
  const puzzle = generatePuzzle(1);
  assert.strictEqual(puzzle.letters.length, 6, `Expected 6 letters, got ${puzzle.letters.length}`);
  assert.ok(puzzle.hasFullWord, 'Puzzle should have at least one 6-letter word');
  assert.ok(puzzle.totalWords > 0, 'Puzzle should have some valid words');
});

// Test: generatePuzzle returns correct structure for level 6 (7 letters)
test('generatePuzzle returns 7 letters for level 6', () => {
  const puzzle = generatePuzzle(6);
  assert.strictEqual(puzzle.letters.length, 7, `Expected 7 letters, got ${puzzle.letters.length}`);
  assert.ok(puzzle.hasFullWord, 'Puzzle should have at least one 7-letter word');
});

// Test: generatePuzzle returns correct structure for level 11 (8 letters)
test('generatePuzzle returns 8 letters for level 11', () => {
  const puzzle = generatePuzzle(11);
  assert.strictEqual(puzzle.letters.length, 8, `Expected 8 letters, got ${puzzle.letters.length}`);
  assert.ok(puzzle.hasFullWord, 'Puzzle should have at least one 8-letter word');
});

// Test: validateWord accepts valid 3-letter words
test('validateWord accepts valid 3-letter words', () => {
  assert.ok(validateWord('CAT', ['C', 'A', 'T', 'S', 'L', 'E']), 'CAT should be valid');
});

// Test: validateWord accepts valid 6-letter words
test('validateWord accepts valid 6-letter words', () => {
  assert.ok(validateWord('CASTLE', ['C', 'A', 'S', 'T', 'L', 'E']), 'CASTLE should be valid');
});

// Test: validateWord accepts valid 8-letter words
test('validateWord accepts valid 8-letter words', () => {
  assert.ok(validateWord('TRIANGLE', ['T', 'R', 'I', 'A', 'N', 'G', 'L', 'E']), 'TRIANGLE should be valid');
});

// Test: validateWord rejects words not in dictionary
test('validateWord rejects non-dictionary words', () => {
  assert.ok(!validateWord('XYZABC', ['X', 'Y', 'Z', 'A', 'B', 'C']), 'XYZABC should be invalid');
});

// Test: validateWord rejects words using unavailable letters
test('validateWord rejects words using unavailable letters', () => {
  assert.ok(!validateWord('QUEEN', ['C', 'A', 'S', 'T', 'L', 'E']), 'QUEEN should be invalid (no Q, U, N)');
});

// Test: validateWord rejects words under 3 letters
test('validateWord rejects words under 3 letters', () => {
  assert.ok(!validateWord('AT', ['A', 'T', 'C', 'S', 'L', 'E']), 'AT should be invalid (too short)');
});

// Test: getAllValidWords returns array of valid words
test('getAllValidWords returns valid words for CASTLE letters', () => {
  const words = getAllValidWords('CASTLE');
  assert.ok(Array.isArray(words), 'Should return an array');
  assert.ok(words.includes('CASTLE'), 'Should include CASTLE');
  assert.ok(words.includes('CAT'), 'Should include CAT');
  assert.ok(words.includes('ATE'), 'Should include ATE');
  assert.ok(words.every(w => w.length >= 3), 'All words should be 3+ letters');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
