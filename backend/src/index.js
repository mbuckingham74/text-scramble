const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');
const { generatePuzzle, validateWord, getAllValidWords } = require('./game');
const dictionary = require('./dictionary');
const { calculatePoints } = require('./constants');
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');
const { registerSchema, loginSchema, validateWordSchema, solutionsSchema, scoreSchema, validate } = require('./validation');
const { initSessionStore, setRedisReady, createSession, getSession, recordWord, getSessionSummary, endSession, getSessionCount, isTimedSessionExpired, createAdminSession, validateAdminSession, deleteAdminSession, ADMIN_SESSION_TTL_MS } = require('./session');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy configuration for correct client IP detection behind reverse proxies
// Set TRUST_PROXY_HOPS to match your exact proxy chain depth:
//   1 = NPM -> app
//   2 = Cloudflare -> NPM -> app
// Wrong values cause either IP spoofing (too high) or broken rate limiting (too low/missing)
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.TRUST_PROXY_HOPS) {
  const parsedHops = Number(process.env.TRUST_PROXY_HOPS);
  if (isNaN(parsedHops)) {
    console.error(`FATAL: TRUST_PROXY_HOPS must be a number, got: "${process.env.TRUST_PROXY_HOPS}"`);
    process.exit(1);
  }
  app.set('trust proxy', parsedHops);
} else if (isProduction) {
  console.warn('WARNING: TRUST_PROXY_HOPS not set in production. Rate limiting may not work correctly behind a proxy.');
  console.warn('Set to your proxy chain depth (e.g., 1 for NPM -> app, 2 for Cloudflare -> NPM -> app)');
}

// Redis client for rate limiting (with fallback to memory store)
let redisClient = null;
let redisReady = false;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err.message);
    redisReady = false;
    setRedisReady(false);
  });

  redisClient.on('ready', () => {
    console.log('Connected to Redis for rate limiting and sessions');
    redisReady = true;
    setRedisReady(true);
    initSessionStore(redisClient, true);
  });

  redisClient.on('end', () => {
    console.log('Redis connection closed');
    redisReady = false;
    setRedisReady(false);
  });

  redisClient.connect().catch(err => {
    console.error('Failed to connect to Redis:', err.message);
    console.log('Rate limiting and sessions will use in-memory store');
  });
} else {
  console.log('REDIS_URL not set - using in-memory rate limiting');
}

// CORS - restrict to known origins
// Set CORS_ORIGINS env var to override (comma-separated list)
const defaultOrigins = [
  'https://twist.tachyonfuture.com',
  'http://localhost:3000',
  'http://localhost:3001'
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin requests, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Return false for disallowed origins (clean denial, no error)
    callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Memory stores for fallback (one per limiter prefix)
const memoryStores = new Map();

// Get or create a memory store for a prefix
const getMemoryStore = (prefix, windowMs) => {
  if (!memoryStores.has(prefix)) {
    const { MemoryStore } = require('express-rate-limit');
    memoryStores.set(prefix, new MemoryStore());
  }
  return memoryStores.get(prefix);
};

// Create Redis store with error handling that falls back gracefully
const createRedisStore = (prefix) => {
  return new RedisStore({
    sendCommand: async (...args) => {
      if (!redisReady) {
        throw new Error('Redis not ready');
      }
      return redisClient.sendCommand(args);
    },
    prefix: `wordtwist:${prefix}:`
  });
};

// Rate limiter factory with dynamic store selection per request
const createLimiter = (options, prefix) => {
  // Create stores upfront
  const memoryStore = getMemoryStore(prefix, options.windowMs);
  let redisStore = null;
  let redisStoreInitialized = false;

  // Lazy initialize Redis store only when Redis is ready
  const getRedisStore = () => {
    if (!redisClient || !redisReady) return null;
    if (!redisStore) {
      try {
        redisStore = createRedisStore(prefix);
        redisStoreInitialized = false;
      } catch (err) {
        console.error(`Failed to create Redis store for ${prefix}:`, err.message);
        return null;
      }
    }
    return redisStore;
  };

  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    // Use a custom store wrapper that checks Redis availability per request
    store: {
      init: (options) => {
        // Only initialize memory store at startup
        memoryStore.init?.(options);
        // Redis store will be lazily initialized on first use when ready
      },
      // Note: get() is not part of the express-rate-limit Store interface
      // The library uses increment() which returns totalHits and resetTime
      increment: async (key) => {
        const store = getRedisStore();
        if (store) {
          try {
            if (!redisStoreInitialized) {
              // Initialize on first use
              redisStoreInitialized = true;
            }
            return await store.increment(key);
          } catch (err) {
            console.error(`Redis increment error for ${prefix}, falling back to memory:`, err.message);
          }
        }
        return memoryStore.increment(key);
      },
      decrement: async (key) => {
        const store = getRedisStore();
        if (store) {
          try {
            return await store.decrement(key);
          } catch (err) {
            console.error(`Redis decrement error for ${prefix}, falling back to memory:`, err.message);
          }
        }
        return memoryStore.decrement(key);
      },
      resetKey: async (key) => {
        const store = getRedisStore();
        if (store) {
          try {
            return await store.resetKey(key);
          } catch (err) {
            console.error(`Redis resetKey error for ${prefix}, falling back to memory:`, err.message);
          }
        }
        return memoryStore.resetKey(key);
      }
    },
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    }
  });
};

// Rate limiting for auth endpoints (strictest)
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many attempts, please try again later' }
}, 'auth');

// Rate limiter for game endpoints (puzzle, validate, solutions)
const gameLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: { error: 'Too many game requests, please slow down' }
}, 'game');

// Rate limiter for score submission
const scoreLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 score submissions per minute
  message: { error: 'Too many score submissions' }
}, 'score');

// General rate limiter for other endpoints (leaderboard, health)
const generalLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: { error: 'Too many requests, please slow down' }
}, 'general');

// Generate a new puzzle
app.get('/api/puzzle', gameLimiter, async (req, res) => {
  const level = parseInt(req.query.level) || 1;
  const gameMode = req.query.mode === 'untimed' ? 'untimed' : 'timed';
  const puzzle = generatePuzzle(level);

  // Create a server-side session to track this game
  const sessionId = await createSession(puzzle.letters, level, gameMode);

  res.json({ ...puzzle, sessionId });
});

// Validate a word submission
app.post('/api/validate', gameLimiter, validate(validateWordSchema), async (req, res) => {
  const { word, sessionId } = req.validated;
  const upperWord = word.toUpperCase();

  // Get session and validate against server-stored letters (not client-provided)
  const session = await getSession(sessionId);
  if (!session) {
    return res.status(400).json({ valid: false, word: upperWord, error: 'Invalid or expired session' });
  }

  // Check if timed session has exceeded time limit
  if (isTimedSessionExpired(session)) {
    await endSession(sessionId); // Clean up stale session
    return res.status(400).json({ valid: false, word: upperWord, error: 'Time expired' });
  }

  // Validate word against the session's letters
  const isValid = validateWord(upperWord, session.letters);
  const points = isValid ? calculatePoints(upperWord.length) : 0;

  if (!isValid) {
    return res.json({ valid: false, word: upperWord, points: 0 });
  }

  // Record the word server-side
  const result = await recordWord(sessionId, upperWord, points);
  if (!result.success) {
    // Word already found in this session
    return res.json({ valid: false, word: upperWord, error: result.error });
  }

  res.json({ valid: true, word: upperWord, points, sessionScore: result.sessionScore });
});

// Get all valid words for a set of letters (for end of round reveal)
app.post('/api/solutions', gameLimiter, validate(solutionsSchema), async (req, res) => {
  const { sessionId } = req.validated;

  // Get session to retrieve letters
  const session = await getSession(sessionId);
  if (!session) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  // Check if timed session has exceeded time limit
  if (isTimedSessionExpired(session)) {
    await endSession(sessionId); // Clean up stale session
    return res.status(400).json({ error: 'Time expired' });
  }

  const words = getAllValidWords(session.letters.join(''));
  res.json({ words });
});

// Register a new user
app.post('/api/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { username, password } = req.validated;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );
    const token = generateToken(result.insertId, username);
    res.cookie(USER_COOKIE_NAME, token, userCookieOptions);
    // Return token in response for backward compatibility with non-browser clients
    res.json({ success: true, userId: result.insertId, username, token });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { username, password } = req.validated;

  try {
    const [rows] = await db.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user.id, user.username);
    res.cookie(USER_COOKIE_NAME, token, userCookieOptions);
    // Return token in response for backward compatibility with non-browser clients
    res.json({ success: true, userId: user.id, username: user.username, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout (clear user JWT cookie)
app.post('/api/logout', (req, res) => {
  res.clearCookie(USER_COOKIE_NAME, { path: '/api' });
  res.json({ success: true });
});

// Submit a score (requires auth and valid session)
app.post('/api/scores', scoreLimiter, authMiddleware, validate(scoreSchema), async (req, res) => {
  const { sessionId } = req.validated;
  const userId = req.user.userId; // From JWT token, not request body

  // Get session first to check timer before ending
  const session = await getSession(sessionId);
  if (!session) {
    return res.status(400).json({ error: 'Invalid or expired game session' });
  }

  // Check if timed session has exceeded time limit
  if (isTimedSessionExpired(session)) {
    // End the session but reject the score
    await endSession(sessionId);
    return res.status(400).json({ error: 'Time expired - score not recorded' });
  }

  // Session is valid - end it and get summary
  const summary = await endSession(sessionId);
  if (!summary) {
    return res.status(400).json({ error: 'Invalid or expired game session' });
  }

  const { score, level, wordsFound, gameMode } = summary;

  try {
    const [result] = await db.execute(
      'INSERT INTO scores (user_id, score, level, words_found, game_mode) VALUES (?, ?, ?, ?, ?)',
      [userId, score, level, wordsFound, gameMode]
    );
    res.json({ success: true, scoreId: result.insertId, verified: true });
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Get leaderboard (top 10 scores per mode) - public
app.get('/api/leaderboard', generalLimiter, async (req, res) => {
  try {
    const [timedRows] = await db.execute(`
      SELECT s.id, s.score, s.level, s.words_found, s.game_mode, s.created_at, u.username
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.game_mode = 'timed'
      ORDER BY s.score DESC
      LIMIT 10
    `);
    const [untimedRows] = await db.execute(`
      SELECT s.id, s.score, s.level, s.words_found, s.game_mode, s.created_at, u.username
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.game_mode = 'untimed'
      ORDER BY s.score DESC
      LIMIT 10
    `);
    res.json({ timed: timedRows, untimed: untimedRows });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get current user's best scores (requires auth)
app.get('/api/scores/me', generalLimiter, authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rows] = await db.execute(`
      SELECT id, score, level, words_found, game_mode, created_at
      FROM scores
      WHERE user_id = ?
      ORDER BY score DESC
      LIMIT 10
    `, [userId]);
    res.json({ scores: rows });
  } catch (error) {
    console.error('User scores error:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Health check (no rate limit - used for monitoring)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Cookie secure flag - defaults to true in production, but can be explicitly set via COOKIE_SECURE
// Set COOKIE_SECURE=false for HTTP-only deployments (not recommended for production)
const cookieSecure = process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : isProduction;

// Cookie settings for admin session
const ADMIN_COOKIE_NAME = 'wordtwist_admin_session';
const adminCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSecure ? 'strict' : 'lax',
  maxAge: ADMIN_SESSION_TTL_MS,
  path: '/api/admin'
};

// Cookie settings for user JWT (7 days, matching JWT_EXPIRES_IN)
const USER_COOKIE_NAME = 'wordtwist_token';
const USER_JWT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const userCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSecure ? 'strict' : 'lax',
  maxAge: USER_JWT_TTL_MS,
  path: '/api'
};

// Admin auth middleware - validates session cookie
const adminAuth = async (req, res, next) => {
  // Disable admin endpoint if credentials not configured
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin endpoint not configured' });
  }

  const sessionId = req.cookies[ADMIN_COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const isValid = await validateAdminSession(sessionId);
  if (!isValid) {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/admin' });
    return res.status(401).json({ error: 'Session expired' });
  }

  next();
};

// Admin login endpoint
app.post('/api/admin/login', authLimiter, async (req, res) => {
  // Disable admin endpoint if credentials not configured
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin endpoint not configured' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sessionId = await createAdminSession();
    res.cookie(ADMIN_COOKIE_NAME, sessionId, adminCookieOptions);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

// Admin logout endpoint
app.post('/api/admin/logout', async (req, res) => {
  const sessionId = req.cookies[ADMIN_COOKIE_NAME];
  if (sessionId) {
    await deleteAdminSession(sessionId);
  }
  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/api/admin' });
  res.json({ success: true });
});

// Admin stats endpoint
app.get('/api/admin/stats', generalLimiter, adminAuth, async (req, res) => {
  try {
    // Get total registered users
    const [[{ userCount }]] = await db.execute('SELECT COUNT(*) as userCount FROM users');

    // Get total games played (each score entry = one game)
    const [[{ gamesPlayed }]] = await db.execute('SELECT COUNT(*) as gamesPlayed FROM scores');

    // Get total words correctly guessed across all games
    const [[{ totalWordsGuessed }]] = await db.execute('SELECT COALESCE(SUM(words_found), 0) as totalWordsGuessed FROM scores');

    // Get games by mode
    const [[{ timedGames }]] = await db.execute("SELECT COUNT(*) as timedGames FROM scores WHERE game_mode = 'timed'");
    const [[{ untimedGames }]] = await db.execute("SELECT COUNT(*) as untimedGames FROM scores WHERE game_mode = 'untimed'");

    // Get recent registrations (last 7 days)
    const [[{ recentUsers }]] = await db.execute(
      'SELECT COUNT(*) as recentUsers FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    // Get recent games (last 7 days)
    const [[{ recentGames }]] = await db.execute(
      'SELECT COUNT(*) as recentGames FROM scores WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    res.json({
      userCount,
      gamesPlayed,
      totalWordsGuessed,
      timedGames,
      untimedGames,
      recentUsers,
      recentGames,
      dictionarySize: dictionary.size,
      activeSessions: await getSessionCount()
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Word Twist backend running on port ${PORT}`);
});
