const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { generatePuzzle, validateWord, getAllValidWords } = require('./game');
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');
const { registerSchema, loginSchema, validateWordSchema, solutionsSchema, scoreSchema, validate } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - restrict to known origins
const allowedOrigins = [
  'https://twist.tachyonfuture.com',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) in dev only
    if (!origin && process.env.NODE_ENV !== 'production') {
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

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// Generate a new puzzle
app.get('/api/puzzle', (req, res) => {
  const puzzle = generatePuzzle();
  res.json(puzzle);
});

// Validate a word submission
app.post('/api/validate', validate(validateWordSchema), (req, res) => {
  const { word, letters } = req.validated;
  const isValid = validateWord(word, letters);
  res.json({ valid: isValid, word: word.toUpperCase() });
});

// Get all valid words for a set of letters (for end of round reveal)
app.post('/api/solutions', validate(solutionsSchema), (req, res) => {
  const { letters } = req.validated;
  const words = getAllValidWords(letters);
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
app.post('/api/scores', authMiddleware, validate(scoreSchema), async (req, res) => {
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

// Get leaderboard (top 10 scores) - public
app.get('/api/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.id, s.score, s.level, s.words_found, s.game_mode, s.created_at, u.username
      FROM scores s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.score DESC
      LIMIT 10
    `);
    res.json({ leaderboard: rows });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get current user's best scores (requires auth)
app.get('/api/scores/me', authMiddleware, async (req, res) => {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Word Twist backend running on port ${PORT}`);
});
