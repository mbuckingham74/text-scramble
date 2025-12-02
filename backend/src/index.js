const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { generatePuzzle, validateWord, getAllValidWords } = require('./game');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Generate a new puzzle
app.get('/api/puzzle', (req, res) => {
  const puzzle = generatePuzzle();
  res.json(puzzle);
});

// Validate a word submission
app.post('/api/validate', (req, res) => {
  const { word, letters } = req.body;

  if (!word || !letters) {
    return res.status(400).json({ error: 'Missing word or letters' });
  }

  const isValid = validateWord(word, letters);
  res.json({ valid: isValid, word: word.toUpperCase() });
});

// Get all valid words for a set of letters (for end of round reveal)
app.post('/api/solutions', (req, res) => {
  const { letters } = req.body;

  if (!letters) {
    return res.status(400).json({ error: 'Missing letters' });
  }

  const words = getAllValidWords(letters);
  res.json({ words });
});

// Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );
    res.json({ success: true, userId: result.insertId, username });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

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

    res.json({ success: true, userId: user.id, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Submit a score
app.post('/api/scores', async (req, res) => {
  const { userId, score, level, wordsFound, gameMode } = req.body;

  if (!userId || score === undefined || !level || wordsFound === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO scores (user_id, score, level, words_found, game_mode) VALUES (?, ?, ?, ?, ?)',
      [userId, score, level, wordsFound, gameMode || 'timed']
    );
    res.json({ success: true, scoreId: result.insertId });
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Get leaderboard (top 10 scores)
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

// Get user's best scores
app.get('/api/scores/:userId', async (req, res) => {
  const { userId } = req.params;

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
