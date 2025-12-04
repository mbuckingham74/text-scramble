// Tests for session.js - timer expiry logic
const assert = require('assert');

// Import the module to test
const { isTimedSessionExpired } = require('./session');
const { TIMER_DURATION } = require('./constants');

console.log('Running session.js tests...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

// Grace period matches session.js (5 seconds)
const GRACE_SECONDS = 5;

// Test: Untimed sessions never expire due to timer
test('isTimedSessionExpired returns false for untimed sessions regardless of time', () => {
  const session = {
    gameMode: 'untimed',
    createdAt: Date.now() - (TIMER_DURATION + 1000) * 1000 // Way past timer
  };
  assert.strictEqual(isTimedSessionExpired(session), false);
});

// Test: Fresh timed session is not expired
test('isTimedSessionExpired returns false for fresh timed session', () => {
  const session = {
    gameMode: 'timed',
    createdAt: Date.now() - 10 * 1000 // 10 seconds ago
  };
  assert.strictEqual(isTimedSessionExpired(session), false);
});

// Test: Timed session at exactly timer duration is not expired (within grace)
test('isTimedSessionExpired returns false at exactly TIMER_DURATION', () => {
  const session = {
    gameMode: 'timed',
    createdAt: Date.now() - TIMER_DURATION * 1000
  };
  assert.strictEqual(isTimedSessionExpired(session), false);
});

// Test: Timed session within grace period is not expired
test('isTimedSessionExpired returns false within grace period', () => {
  const session = {
    gameMode: 'timed',
    createdAt: Date.now() - (TIMER_DURATION + GRACE_SECONDS - 1) * 1000
  };
  assert.strictEqual(isTimedSessionExpired(session), false);
});

// Test: Timed session past grace period IS expired
test('isTimedSessionExpired returns true after grace period', () => {
  const session = {
    gameMode: 'timed',
    createdAt: Date.now() - (TIMER_DURATION + GRACE_SECONDS + 1) * 1000
  };
  assert.strictEqual(isTimedSessionExpired(session), true);
});

// Test: Very old timed session is expired
test('isTimedSessionExpired returns true for very old timed session', () => {
  const session = {
    gameMode: 'timed',
    createdAt: Date.now() - 3600 * 1000 // 1 hour ago
  };
  assert.strictEqual(isTimedSessionExpired(session), true);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
