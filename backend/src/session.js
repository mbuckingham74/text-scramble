const crypto = require('crypto');
const { TIMER_DURATION } = require('./constants');

// Game session expiry time (2 hours - enough for a long game)
const SESSION_TTL_SECONDS = 2 * 60 * 60;

// Grace period for timed mode (allows for network latency)
const TIMED_MODE_GRACE_SECONDS = 5;

// Admin session expiry time (8 hours)
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

// Redis client (set by init function)
let redisClient = null;
let redisReady = false;

// In-memory fallback for when Redis is unavailable
const memorySessions = new Map();
const memoryAdminSessions = new Map();

// Lua script for atomic word recording (check + add + increment)
// Returns: [success (0/1), newScore, errorMessage]
const RECORD_WORD_SCRIPT = `
local sessionKey = KEYS[1]
local wordsKey = KEYS[2]
local word = ARGV[1]
local points = tonumber(ARGV[2])

-- Check if session exists
local sessionData = redis.call('GET', sessionKey)
if not sessionData then
  return {0, 0, 'Session expired or invalid'}
end

-- Check if word already found (atomic set add)
local added = redis.call('SADD', wordsKey, word)
if added == 0 then
  return {0, 0, 'Word already found'}
end

-- Parse session, update score, save back
local session = cjson.decode(sessionData)
session.score = session.score + points
table.insert(session.foundWords, word)

-- Get TTL and preserve it
local ttl = redis.call('TTL', sessionKey)
if ttl > 0 then
  redis.call('SETEX', sessionKey, ttl, cjson.encode(session))
  redis.call('EXPIRE', wordsKey, ttl)
end

return {1, session.score, ''}
`;

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

// Get Redis keys for session
function getRedisKey(sessionId) {
  return `wordtwist:session:${sessionId}`;
}

function getWordsKey(sessionId) {
  return `wordtwist:words:${sessionId}`;
}

// Check memory for session (with expiry check)
function getMemorySession(sessionId) {
  const session = memorySessions.get(sessionId);
  if (!session) return null;

  // Check if expired
  if (Date.now() - session.createdAt > SESSION_TTL_SECONDS * 1000) {
    memorySessions.delete(sessionId);
    return null;
  }

  return session;
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

// Get a session by ID - checks both Redis and memory
async function getSession(sessionId) {
  // Try Redis first
  if (redisClient && redisReady) {
    try {
      const data = await redisClient.get(getRedisKey(sessionId));
      if (data) {
        return JSON.parse(data);
      }
      // Redis returned null - session might be in memory (created during outage)
      // Fall through to memory check
    } catch (err) {
      console.error('Redis session get error, checking memory:', err.message);
      // Fall through to memory check
    }
  }

  // Always check memory fallback (handles Redis miss or Redis unavailable)
  return getMemorySession(sessionId);
}

// Record a found word atomically
async function recordWord(sessionId, word, points) {
  const upperWord = word.toUpperCase();

  // Try atomic Redis operation first
  if (redisClient && redisReady) {
    try {
      const result = await redisClient.eval(RECORD_WORD_SCRIPT, {
        keys: [getRedisKey(sessionId), getWordsKey(sessionId)],
        arguments: [upperWord, points.toString()]
      });

      const [success, newScore, errorMessage] = result;
      if (success === 1) {
        return { success: true, sessionScore: newScore };
      }

      // If session not in Redis, might be in memory - fall through
      if (errorMessage === 'Session expired or invalid') {
        const memSession = getMemorySession(sessionId);
        if (memSession) {
          // Session is in memory, handle there
          return recordWordMemory(sessionId, memSession, upperWord, points);
        }
      }

      return { success: false, error: errorMessage };
    } catch (err) {
      console.error('Redis recordWord error, falling back to memory:', err.message);
      // Fall through to memory
    }
  }

  // Memory fallback
  const session = getMemorySession(sessionId);
  if (!session) {
    return { success: false, error: 'Session expired or invalid' };
  }

  return recordWordMemory(sessionId, session, upperWord, points);
}

// Record word in memory (for fallback)
function recordWordMemory(sessionId, session, word, points) {
  if (session.foundWords.includes(word)) {
    return { success: false, error: 'Word already found' };
  }

  session.foundWords.push(word);
  session.score += points;
  memorySessions.set(sessionId, session);

  return { success: true, sessionScore: session.score };
}

// Check if a timed session has exceeded its time limit
function isTimedSessionExpired(session) {
  if (session.gameMode !== 'timed') {
    return false; // Untimed sessions never expire due to timer
  }

  const elapsedMs = Date.now() - session.createdAt;
  const allowedMs = (TIMER_DURATION + TIMED_MODE_GRACE_SECONDS) * 1000;
  return elapsedMs > allowedMs;
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
    foundWords: session.foundWords,
    createdAt: session.createdAt
  };
}

// End a session and return final summary
async function endSession(sessionId) {
  const summary = await getSessionSummary(sessionId);
  if (!summary) return null;

  // Delete from Redis
  if (redisClient && redisReady) {
    try {
      await redisClient.del(getRedisKey(sessionId));
      await redisClient.del(getWordsKey(sessionId));
    } catch (err) {
      console.error('Redis session delete error:', err.message);
    }
  }

  // Always delete from memory too
  memorySessions.delete(sessionId);

  return summary;
}

// Get session count (for monitoring)
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

  // Clean game sessions
  for (const [sessionId, session] of memorySessions) {
    if (now - session.createdAt > SESSION_TTL_SECONDS * 1000) {
      memorySessions.delete(sessionId);
      cleaned++;
    }
  }

  // Clean admin sessions
  let adminCleaned = 0;
  for (const [sessionId, session] of memoryAdminSessions) {
    if (now - session.createdAt > ADMIN_SESSION_TTL_SECONDS * 1000) {
      memoryAdminSessions.delete(sessionId);
      adminCleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired game sessions`);
  }
  if (adminCleaned > 0) {
    console.log(`Cleaned up ${adminCleaned} expired admin sessions`);
  }
}

// Start cleanup interval for memory sessions (every 10 minutes)
setInterval(cleanupMemorySessions, 10 * 60 * 1000);

// ============ Admin Session Functions ============

function getAdminRedisKey(sessionId) {
  return `wordtwist:admin:${sessionId}`;
}

// Create an admin session
async function createAdminSession() {
  const sessionId = generateSessionId();
  const session = {
    sessionId,
    createdAt: Date.now()
  };

  if (redisClient && redisReady) {
    try {
      await redisClient.setEx(
        getAdminRedisKey(sessionId),
        ADMIN_SESSION_TTL_SECONDS,
        JSON.stringify(session)
      );
      return sessionId;
    } catch (err) {
      console.error('Redis admin session create error, falling back to memory:', err.message);
    }
  }

  // Memory fallback
  memoryAdminSessions.set(sessionId, session);
  return sessionId;
}

// Validate an admin session
async function validateAdminSession(sessionId) {
  if (!sessionId) return false;

  // Try Redis first
  if (redisClient && redisReady) {
    try {
      const data = await redisClient.get(getAdminRedisKey(sessionId));
      if (data) return true;
    } catch (err) {
      console.error('Redis admin session validate error:', err.message);
    }
  }

  // Check memory fallback
  const session = memoryAdminSessions.get(sessionId);
  if (!session) return false;

  // Check expiry
  if (Date.now() - session.createdAt > ADMIN_SESSION_TTL_SECONDS * 1000) {
    memoryAdminSessions.delete(sessionId);
    return false;
  }

  return true;
}

// Delete an admin session
async function deleteAdminSession(sessionId) {
  if (!sessionId) return;

  if (redisClient && redisReady) {
    try {
      await redisClient.del(getAdminRedisKey(sessionId));
    } catch (err) {
      console.error('Redis admin session delete error:', err.message);
    }
  }

  memoryAdminSessions.delete(sessionId);
}

// Export admin session TTL for cookie maxAge
const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_TTL_SECONDS * 1000;

module.exports = {
  initSessionStore,
  setRedisReady,
  createSession,
  getSession,
  recordWord,
  getSessionSummary,
  endSession,
  getSessionCount,
  isTimedSessionExpired,
  // Admin session exports
  createAdminSession,
  validateAdminSession,
  deleteAdminSession,
  ADMIN_SESSION_TTL_MS
};
