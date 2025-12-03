const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createClient } = require('redis');
const { generatePuzzle, validateWord, getAllValidWords } = require('./game');
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');
const { registerSchema, loginSchema, validateWordSchema, solutionsSchema, scoreSchema, validate } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - set to 2 for the two proxies in our chain (Cloudflare -> NPM -> app)
// This tells Express to use the 2nd-from-end IP in X-Forwarded-For as the client IP
app.set('trust proxy', 2);

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
  });

  redisClient.on('ready', () => {
    console.log('Connected to Redis for rate limiting');
    redisReady = true;
  });

  redisClient.on('end', () => {
    console.log('Redis connection closed');
    redisReady = false;
  });

  redisClient.connect().catch(err => {
    console.error('Failed to connect to Redis:', err.message);
    console.log('Rate limiting will use in-memory store');
  });
} else {
  console.log('REDIS_URL not set - using in-memory rate limiting');
}

// CORS - restrict to known origins
const allowedOrigins = [
  'https://twist.tachyonfuture.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin requests, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));

// Create rate limiter store - uses Redis if available, otherwise falls back to memory
const createStore = (prefix) => {
  if (redisClient && redisReady) {
    return new RedisStore({
      sendCommand: async (...args) => {
        if (!redisReady) {
          throw new Error('Redis not ready');
        }
        return redisClient.sendCommand(args);
      },
      prefix: `wordtwist:${prefix}:`
    });
  }
  // Return undefined to use default MemoryStore
  return undefined;
};

// Rate limiter factory - creates limiter with dynamic store selection
const createLimiter = (options, prefix) => {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    // Dynamically get store on each request to handle Redis reconnection
    store: createStore(prefix),
    // Skip store errors - fall back to allowing the request rather than 500
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
app.get('/api/puzzle', gameLimiter, (req, res) => {
  const puzzle = generatePuzzle();
  res.json(puzzle);
});

// Validate a word submission
app.post('/api/validate', gameLimiter, validate(validateWordSchema), (req, res) => {
  const { word, letters } = req.validated;
  const isValid = validateWord(word, letters);
  res.json({ valid: isValid, word: word.toUpperCase() });
});

// Get all valid words for a set of letters (for end of round reveal)
app.post('/api/solutions', gameLimiter, validate(solutionsSchema), (req, res) => {
  const { letters } = req.validated;
  // letters is an array, getAllValidWords expects a string
  const words = getAllValidWords(letters.join(''));
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
    res.json({ success: true, userId: user.id, username: user.username, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Submit a score (requires auth)
app.post('/api/scores', scoreLimiter, authMiddleware, validate(scoreSchema), async (req, res) => {
  const { score, level, wordsFound, gameMode } = req.validated;
  const userId = req.user.userId; // From JWT token, not request body

  try {
    const [result] = await db.execute(
      'INSERT INTO scores (user_id, score, level, words_found, game_mode) VALUES (?, ?, ?, ?, ?)',
      [userId, score, level, wordsFound, gameMode]
    );
    res.json({ success: true, scoreId: result.insertId });
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

// Admin credentials (hardcoded for simplicity - in production, use env vars)
const ADMIN_USERNAME = 'michael';
const ADMIN_PASSWORD = 'jag97DOrp';

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
};

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
      recentGames
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Word Twist backend running on port ${PORT}`);
});
