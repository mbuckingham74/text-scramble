const crypto = require('crypto');

// In-memory game session store
// In production with multiple instances, this should use Redis
const sessions = new Map();

// Session expiry time (2 hours - enough for a long game)
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

// Cleanup interval (every 10 minutes)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

// Generate a secure session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Create a new game session
function createSession(letters, level, gameMode) {
  const sessionId = generateSessionId();
  const session = {
    sessionId,
    letters: letters.map(l => l.toUpperCase()),
    level,
    gameMode,
    foundWords: new Set(),
    score: 0,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  sessions.set(sessionId, session);
  return sessionId;
}

// Get a session by ID
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Check if expired
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }

  session.lastActivity = Date.now();
  return session;
}

// Record a found word and return points earned (0 if already found or invalid)
function recordWord(sessionId, word, points) {
  const session = getSession(sessionId);
  if (!session) return { success: false, error: 'Session expired or invalid' };

  const upperWord = word.toUpperCase();
  if (session.foundWords.has(upperWord)) {
    return { success: false, error: 'Word already found' };
  }

  session.foundWords.add(upperWord);
  session.score += points;
  session.lastActivity = Date.now();

  return { success: true, sessionScore: session.score };
}

// Get session summary for score submission
function getSessionSummary(sessionId) {
  const session = getSession(sessionId);
  if (!session) return null;

  return {
    letters: session.letters,
    level: session.level,
    gameMode: session.gameMode,
    wordsFound: session.foundWords.size,
    score: session.score,
    foundWords: Array.from(session.foundWords)
  };
}

// End a session and return final summary
function endSession(sessionId) {
  const summary = getSessionSummary(sessionId);
  if (summary) {
    sessions.delete(sessionId);
  }
  return summary;
}

// Cleanup expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;
  for (const [sessionId, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired game sessions`);
  }
}

// Start cleanup interval
setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

// Get session count (for monitoring)
function getSessionCount() {
  return sessions.size;
}

module.exports = {
  createSession,
  getSession,
  recordWord,
  getSessionSummary,
  endSession,
  getSessionCount
};
