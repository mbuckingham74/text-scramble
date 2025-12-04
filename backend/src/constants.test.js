/**
 * Tests to verify frontend/backend constants stay in sync
 * Run with: node src/constants.test.js
 *
 * Note: This test requires the frontend directory to be present.
 * When running backend tests in isolation (e.g., Docker build), this test is skipped.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const backendConstants = require('./constants');

// Read frontend constants file as text (it's ES modules, can't require it)
const frontendConstantsPath = path.join(__dirname, '../../frontend/src/constants.js');

// Skip tests if frontend is not present (e.g., isolated backend Docker build)
if (!fs.existsSync(frontendConstantsPath)) {
  console.log('Skipping constants sync tests: frontend/src/constants.js not found');
  console.log('This is expected when running backend tests in isolation.');
  process.exit(0);
}

const frontendSource = fs.readFileSync(frontendConstantsPath, 'utf-8');

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

// Extract value from ES module source
function extractConstant(source, name) {
  // Match: export const NAME = VALUE;
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*([^;]+);`));
  if (!match) return undefined;
  // Handle numbers and simple expressions
  const value = match[1].trim();
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value;
}

// Extract object from ES module source
function extractObject(source, name) {
  // Match multi-line object with nested braces
  const regex = new RegExp(`export const ${name}\\s*=\\s*({[\\s\\S]*?^});`, 'm');
  const match = source.match(regex);
  if (!match) return undefined;
  // Eval is safe here since we control the source file
  // eslint-disable-next-line no-eval
  return eval(`(${match[1]})`);
}

console.log('Running constants sync tests...\n');

// Test: Timer constants match
test('TIMER_DURATION matches between frontend and backend', () => {
  const frontend = extractConstant(frontendSource, 'TIMER_DURATION');
  assert.strictEqual(frontend, backendConstants.TIMER_DURATION,
    `Frontend: ${frontend}, Backend: ${backendConstants.TIMER_DURATION}`);
});

test('TIMER_WARNING_THRESHOLD matches between frontend and backend', () => {
  const frontend = extractConstant(frontendSource, 'TIMER_WARNING_THRESHOLD');
  assert.strictEqual(frontend, backendConstants.TIMER_WARNING_THRESHOLD,
    `Frontend: ${frontend}, Backend: ${backendConstants.TIMER_WARNING_THRESHOLD}`);
});

test('TIMER_CRITICAL_THRESHOLD matches between frontend and backend', () => {
  const frontend = extractConstant(frontendSource, 'TIMER_CRITICAL_THRESHOLD');
  assert.strictEqual(frontend, backendConstants.TIMER_CRITICAL_THRESHOLD,
    `Frontend: ${frontend}, Backend: ${backendConstants.TIMER_CRITICAL_THRESHOLD}`);
});

// Test: Word validation constants match
test('MIN_WORD_LENGTH matches between frontend and backend', () => {
  const frontend = extractConstant(frontendSource, 'MIN_WORD_LENGTH');
  assert.strictEqual(frontend, backendConstants.MIN_WORD_LENGTH,
    `Frontend: ${frontend}, Backend: ${backendConstants.MIN_WORD_LENGTH}`);
});

// Test: Scoring constants match
test('POINTS_PER_LETTER matches between frontend and backend', () => {
  const frontend = extractConstant(frontendSource, 'POINTS_PER_LETTER');
  assert.strictEqual(frontend, backendConstants.POINTS_PER_LETTER,
    `Frontend: ${frontend}, Backend: ${backendConstants.POINTS_PER_LETTER}`);
});

test('BONUS_PER_EXTRA_LETTER matches between frontend and backend', () => {
  const frontend = extractConstant(frontendSource, 'BONUS_PER_EXTRA_LETTER');
  assert.strictEqual(frontend, backendConstants.BONUS_PER_EXTRA_LETTER,
    `Frontend: ${frontend}, Backend: ${backendConstants.BONUS_PER_EXTRA_LETTER}`);
});

// Test: Level thresholds match
test('LEVEL_THRESHOLDS matches between frontend and backend', () => {
  const frontend = extractObject(frontendSource, 'LEVEL_THRESHOLDS');
  const backend = backendConstants.LEVEL_THRESHOLDS;

  assert.strictEqual(frontend.SIX_LETTERS.maxLevel, backend.SIX_LETTERS.maxLevel,
    `SIX_LETTERS.maxLevel - Frontend: ${frontend.SIX_LETTERS.maxLevel}, Backend: ${backend.SIX_LETTERS.maxLevel}`);
  assert.strictEqual(frontend.SIX_LETTERS.letterCount, backend.SIX_LETTERS.letterCount,
    `SIX_LETTERS.letterCount - Frontend: ${frontend.SIX_LETTERS.letterCount}, Backend: ${backend.SIX_LETTERS.letterCount}`);

  assert.strictEqual(frontend.SEVEN_LETTERS.maxLevel, backend.SEVEN_LETTERS.maxLevel,
    `SEVEN_LETTERS.maxLevel - Frontend: ${frontend.SEVEN_LETTERS.maxLevel}, Backend: ${backend.SEVEN_LETTERS.maxLevel}`);
  assert.strictEqual(frontend.SEVEN_LETTERS.letterCount, backend.SEVEN_LETTERS.letterCount,
    `SEVEN_LETTERS.letterCount - Frontend: ${frontend.SEVEN_LETTERS.letterCount}, Backend: ${backend.SEVEN_LETTERS.letterCount}`);

  assert.strictEqual(frontend.EIGHT_LETTERS.maxLevel, backend.EIGHT_LETTERS.maxLevel,
    `EIGHT_LETTERS.maxLevel - Frontend: ${frontend.EIGHT_LETTERS.maxLevel}, Backend: ${backend.EIGHT_LETTERS.maxLevel}`);
  assert.strictEqual(frontend.EIGHT_LETTERS.letterCount, backend.EIGHT_LETTERS.letterCount,
    `EIGHT_LETTERS.letterCount - Frontend: ${frontend.EIGHT_LETTERS.letterCount}, Backend: ${backend.EIGHT_LETTERS.letterCount}`);
});

// Test: calculatePoints function produces same results
test('calculatePoints produces same results for word lengths 3-8', () => {
  // We can't import the frontend function, so we replicate the formula check
  const frontendFormula = frontendSource.includes(
    'wordLength * POINTS_PER_LETTER + (wordLength - MIN_WORD_LENGTH) * BONUS_PER_EXTRA_LETTER'
  );
  assert.ok(frontendFormula, 'Frontend calculatePoints should use same formula as backend');

  // Verify backend formula produces expected values
  for (let len = 3; len <= 8; len++) {
    const expected = len * backendConstants.POINTS_PER_LETTER +
      (len - backendConstants.MIN_WORD_LENGTH) * backendConstants.BONUS_PER_EXTRA_LETTER;
    const actual = backendConstants.calculatePoints(len);
    assert.strictEqual(actual, expected, `calculatePoints(${len}) should be ${expected}, got ${actual}`);
  }
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
