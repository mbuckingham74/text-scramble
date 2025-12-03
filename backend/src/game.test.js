/**
 * Tests for game.js - validation schemas and dictionary invariants
 * Run with: node src/game.test.js
 */

const assert = require('assert');
const dictionary = require('./dictionary');
const { generatePuzzle, validateWord, getAllValidWords } = require('./game');

// Helper to get letter signature (sorted letters)
const getSignature = (word) => word.toUpperCase().split('').sort().join('');

// Import puzzle word lists for testing
const puzzleWords6 = [
  'ALMOST', 'BASKET', 'CASTLE', 'DANGER', 'EAGLES', 'FABRIC', 'HANDLE',
  'ISLAND', 'JANGLE', 'KISMET', 'LAMENT', 'NACHOS', 'OBTUSE', 'PALACE',
  'QUARTS', 'RAISIN', 'SAILOR', 'TABLES', 'UNSAFE', 'VALISE', 'WALNUT', 'YANKED',
  'ZEALOT', 'BRANCH', 'CLAMPS', 'DREAMS', 'ELFINS', 'FLAUNT', 'GRAINS', 'HASTEN',
  'INSERT', 'JOINTS', 'KELVIN', 'LOATHE', 'NOSIER', 'OPERAS', 'PLANET',
  'QUIVER', 'REASON', 'TANGLE', 'UNITES', 'VARIES', 'WASTER', 'YOGURT',
  'STRIPE', 'MASTER', 'LISTEN', 'HEARTS', 'TRADES', 'BREAST',
  'CASTER', 'CREATE', 'ORIENT', 'LASTED', 'PETALS', 'ALERTS',
  'RENTAL', 'MERITS', 'STRIDE', 'SATIRE', 'SORTIE'
];

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
