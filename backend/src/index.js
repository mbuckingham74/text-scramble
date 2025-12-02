const express = require('express');
const cors = require('cors');
const { generatePuzzle, validateWord, getAllValidWords } = require('./game');

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Word Twist backend running on port ${PORT}`);
});
