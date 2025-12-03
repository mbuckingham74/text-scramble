const crypto = require('crypto');

// Session expiry time (2 hours - enough for a long game)
const SESSION_TTL_SECONDS = 2 * 60 * 60;

// Redis client (set by init function)
let redisClient = null;
let redisReady = false;

// In-memory fallback for when Redis is unavailable
const memorySessions = new Map();

// Generate a secure session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Initialize session store with Redis client
function initSessionStore(client, ready) {
  redisClient = client;
  redisReady = ready;
}

// Update Redis ready state
function setRedisReady(ready) {
  redisReady = ready;
}

// Get Redis key for session
function getRedisKey(sessionId) {
  return `wordtwist:session:${sessionId}`;
}

// Create a new game session
async function createSession(letters, level, gameMode) {
  const sessionId = generateSessionId();
  const session = {
    sessionId,
    letters: letters.map(l => l.toUpperCase()),
    level,
    gameMode,
    foundWords: [],
    score: 0,
    createdAt: Date.now()
  };

  if (redisClient && redisReady) {
    try {
      await redisClient.setEx(
        getRedisKey(sessionId),
        SESSION_TTL_SECONDS,
        JSON.stringify(session)
      );
      return sessionId;
    } catch (err) {
      console.error('Redis session create error, falling back to memory:', err.message);
    }
  }

  // Memory fallback
  memorySessions.set(sessionId, session);
  return sessionId;
}

// Get a session by ID
async function getSession(sessionId) {
  if (redisClient && redisReady) {
    try {
      const data = await redisClient.get(getRedisKey(sessionId));
      if (data) {
        const session = JSON.parse(data);
        // Convert foundWords back to array if needed
        return session;
      }
      return null;
    } catch (err) {
      console.error('Redis session get error, checking memory:', err.message);
    }
  }

  // Memory fallback
  const session = memorySessions.get(sessionId);
  if (!session) return null;

  // Check if expired (memory store doesn't auto-expire)
  if (Date.now() - session.createdAt > SESSION_TTL_SECONDS * 1000) {
    memorySessions.delete(sessionId);
    return null;
  }

  return session;
}

// Update a session
async function updateSession(sessionId, session) {
  if (redisClient && redisReady) {
    try {
      // Get remaining TTL and preserve it
      const ttl = await redisClient.ttl(getRedisKey(sessionId));
      if (ttl > 0) {
        await redisClient.setEx(
          getRedisKey(sessionId),
          ttl,
          JSON.stringify(session)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Redis session update error, falling back to memory:', err.message);
    }
  }

  // Memory fallback
  if (memorySessions.has(sessionId)) {
    memorySessions.set(sessionId, session);
    return true;
  }
  return false;
}

// Record a found word and return points earned (0 if already found or invalid)
async function recordWord(sessionId, word, points) {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, error: 'Session expired or invalid' };
  }

  const upperWord = word.toUpperCase();
  if (session.foundWords.includes(upperWord)) {
    return { success: false, error: 'Word already found' };
  }

  session.foundWords.push(upperWord);
  session.score += points;

  const updated = await updateSession(sessionId, session);
  if (!updated) {
    return { success: false, error: 'Failed to update session' };
  }

  return { success: true, sessionScore: session.score };
}

// Get session summary for score submission
async function getSessionSummary(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return null;

  return {
    letters: session.letters,
    level: session.level,
    gameMode: session.gameMode,
    wordsFound: session.foundWords.length,
    score: session.score,
    foundWords: session.foundWords
  };
}

// End a session and return final summary
async function endSession(sessionId) {
  const summary = await getSessionSummary(sessionId);
  if (!summary) return null;

  // Delete the session
  if (redisClient && redisReady) {
    try {
      await redisClient.del(getRedisKey(sessionId));
    } catch (err) {
      console.error('Redis session delete error:', err.message);
    }
  }
  memorySessions.delete(sessionId);

  return summary;
}

// Get session count (for monitoring) - approximate for Redis
async function getSessionCount() {
  let count = memorySessions.size;

  if (redisClient && redisReady) {
    try {
      const keys = await redisClient.keys('wordtwist:session:*');
      count = keys.length;
    } catch (err) {
      console.error('Redis session count error:', err.message);
    }
  }

  return count;
}

// Cleanup expired memory sessions (called periodically)
function cleanupMemorySessions() {
  const now = Date.now();
  let cleaned = 0;
  for (const [sessionId, session] of memorySessions) {
    if (now - session.createdAt > SESSION_TTL_SECONDS * 1000) {
      memorySessions.delete(sessionId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired memory sessions`);
  }
}

// Start cleanup interval for memory sessions (every 10 minutes)
setInterval(cleanupMemorySessions, 10 * 60 * 1000);

module.exports = {
  initSessionStore,
  setRedisReady,
  createSession,
  getSession,
  recordWord,
  getSessionSummary,
  endSession,
  getSessionCount
};
