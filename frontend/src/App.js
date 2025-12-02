import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import sounds from './sounds';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing, roundEnd, gameOver
  const [letters, setLetters] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [foundWords, setFoundWords] = useState(new Set());
  const [wordsByLength, setWordsByLength] = useState({});
  const [totalWords, setTotalWords] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(120);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [foundFullWord, setFoundFullWord] = useState(false);
  const [allWords, setAllWords] = useState([]);
  const [timedMode, setTimedMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 1500);
  };

  const toggleSound = () => {
    const enabled = sounds.toggle();
    setSoundEnabled(enabled);
  };

  const startGame = async (timed = true) => {
    sounds.gameStart();
    setTimedMode(timed);
    setScore(0);
    setLevel(1);
    await startNewRound(timed);
  };

  const startNewRound = async (timed = timedMode) => {
    try {
      const response = await fetch(`${API_URL}/puzzle`);
      const data = await response.json();

      setLetters(data.letters);
      setWordsByLength(data.wordsByLength);
      setTotalWords(data.totalWords);
      setFoundWords(new Set());
      setSelectedIndices([]);
      setCurrentWord('');
      setFoundFullWord(false);
      setAllWords([]);
      setTimeLeft(timed ? 120 : -1);
      setGameState('playing');
    } catch (error) {
      console.error('Failed to fetch puzzle:', error);
      showMessage('Failed to load puzzle. Please try again.', 'error');
    }
  };

  const shuffleLetters = () => {
    sounds.shuffle();
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setLetters(shuffled);
    setSelectedIndices([]);
    setCurrentWord('');
  };

  const selectLetter = (index) => {
    if (selectedIndices.includes(index)) return;
    sounds.letterClick();
    setSelectedIndices([...selectedIndices, index]);
    setCurrentWord(currentWord + letters[index]);
  };

  const removeLetter = () => {
    if (selectedIndices.length === 0) return;
    sounds.letterRemove();
    setSelectedIndices(selectedIndices.slice(0, -1));
    setCurrentWord(currentWord.slice(0, -1));
  };

  const clearSelection = () => {
    if (selectedIndices.length > 0) sounds.clearLetters();
    setSelectedIndices([]);
    setCurrentWord('');
  };

  const submitWord = async () => {
    if (currentWord.length < 3) {
      sounds.wordInvalid();
      showMessage('Words must be at least 3 letters!', 'error');
      clearSelection();
      return;
    }

    if (foundWords.has(currentWord.toUpperCase())) {
      sounds.wordDuplicate();
      showMessage('Already found!', 'error');
      clearSelection();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: currentWord, letters })
      });
      const data = await response.json();

      if (data.valid) {
        const newFoundWords = new Set(foundWords);
        newFoundWords.add(data.word);
        setFoundWords(newFoundWords);

        // Calculate points: longer words = more points
        const points = data.word.length * 10 + (data.word.length - 3) * 5;
        setScore(score + points);

        if (data.word.length === 6) {
          sounds.wordExcellent();
          setFoundFullWord(true);
          showMessage('EXCELLENT! Full word found!', 'success');
        } else {
          sounds.wordValid();
          showMessage(`+${points} points!`, 'success');
        }
      } else {
        sounds.wordInvalid();
        showMessage('Not a valid word!', 'error');
      }
    } catch (error) {
      console.error('Validation error:', error);
    }

    clearSelection();
  };

  const endRound = useCallback(async () => {
    // Fetch all solutions
    try {
      const response = await fetch(`${API_URL}/solutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letters: letters.join('') })
      });
      const data = await response.json();
      setAllWords(data.words);
    } catch (error) {
      console.error('Failed to fetch solutions:', error);
    }

    if (foundFullWord) {
      sounds.levelComplete();
      setGameState('roundEnd');
    } else {
      sounds.gameOver();
      setGameState('gameOver');
    }
  }, [letters, foundFullWord]);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || timeLeft === -1) return;

    if (timeLeft <= 0) {
      endRound();
      return;
    }

    // Timer warning sounds
    if (timeLeft <= 10 && timeLeft > 0) {
      sounds.timerCritical();
    } else if (timeLeft <= 30 && timeLeft > 0) {
      sounds.timerTick();
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeLeft, endRound]);

  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        submitWord();
      } else if (e.key === 'Backspace') {
        removeLetter();
      } else if (e.key === ' ') {
        e.preventDefault();
        shuffleLetters();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        clearSelection();
      } else if (e.key.match(/^[a-zA-Z]$/)) {
        const letter = e.key.toUpperCase();
        const index = letters.findIndex((l, i) =>
          l.toUpperCase() === letter && !selectedIndices.includes(i)
        );
        if (index !== -1) {
          selectLetter(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const formatTime = (seconds) => {
    if (seconds === -1) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render word slots
  const renderWordSlots = () => {
    const slots = [];
    const lengths = Object.keys(wordsByLength).sort((a, b) => a - b);

    for (const length of lengths) {
      const words = wordsByLength[length];
      slots.push(
        <div key={length} className="word-group">
          <h3>{length} Letters</h3>
          <div className="word-slots">
            {words.map((word, idx) => (
              <div
                key={idx}
                className={`word-slot ${foundWords.has(word) ? 'found' : ''}`}
              >
                {foundWords.has(word) ? word : word.replace(/./g, '_')}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return slots;
  };

  // Render end screen word list
  const renderAllWords = () => {
    const lengths = Object.keys(wordsByLength).sort((a, b) => a - b);
    return lengths.map(length => (
      <div key={length} className="word-group">
        <h3>{length} Letters</h3>
        <div className="word-list">
          {wordsByLength[length].map((word, idx) => (
            <span
              key={idx}
              className={`word-item ${foundWords.has(word) ? 'found' : 'missed'}`}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    ));
  };

  if (gameState === 'menu') {
    return (
      <div className="app">
        <div className="menu">
          <button className="sound-toggle" onClick={toggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <h1>Word Twist</h1>
          <p className="subtitle">Unscramble letters to find words!</p>
          <div className="menu-buttons">
            <button className="btn primary" onClick={() => startGame(true)}>
              Timed Mode
            </button>
            <button className="btn secondary" onClick={() => startGame(false)}>
              Untimed Mode
            </button>
          </div>
          <div className="instructions">
            <h3>How to Play</h3>
            <ul>
              <li>Click letters or type to form words</li>
              <li>Press <kbd>Enter</kbd> to submit</li>
              <li>Press <kbd>Space</kbd> to shuffle</li>
              <li>Press <kbd>Backspace</kbd> to delete</li>
              <li>Press <kbd>Tab</kbd> to clear</li>
              <li>Find a 6-letter word to advance!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'roundEnd') {
    return (
      <div className="app">
        <div className="round-end">
          <h1>Round Complete!</h1>
          <div className="stats">
            <p>Words Found: {foundWords.size} / {totalWords}</p>
            <p>Score: {score}</p>
            <p>Level: {level}</p>
          </div>
          <div className="all-words">
            <h2>All Words</h2>
            {renderAllWords()}
          </div>
          <button
            className="btn primary"
            onClick={() => {
              setLevel(level + 1);
              startNewRound();
            }}
          >
            Next Level
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="app">
        <div className="game-over">
          <h1>Game Over!</h1>
          <p className="reason">You need to find at least one 6-letter word to continue!</p>
          <div className="stats">
            <p>Final Score: {score}</p>
            <p>Levels Completed: {level - 1}</p>
            <p>Words Found This Round: {foundWords.size} / {totalWords}</p>
          </div>
          <div className="all-words">
            <h2>All Words</h2>
            {renderAllWords()}
          </div>
          <button className="btn primary" onClick={() => setGameState('menu')}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game">
        <header className="game-header">
          <button className="sound-toggle-small" onClick={toggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <div className="stat">
            <span className="label">Level</span>
            <span className="value">{level}</span>
          </div>
          <div className="stat">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
          <div className={`stat timer ${timeLeft <= 30 && timeLeft > 0 ? 'warning' : ''}`}>
            <span className="label">Time</span>
            <span className="value">{formatTime(timeLeft)}</span>
          </div>
          <div className="stat">
            <span className="label">Found</span>
            <span className="value">{foundWords.size}/{totalWords}</span>
          </div>
        </header>

        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="word-display">
          {renderWordSlots()}
        </div>

        <div className="current-word">
          <div className="word-box">
            {currentWord || '\u00A0'}
          </div>
        </div>

        <div className="letter-rack">
          {letters.map((letter, index) => (
            <button
              key={index}
              className={`letter-tile ${selectedIndices.includes(index) ? 'selected' : ''}`}
              onClick={() => selectLetter(index)}
              disabled={selectedIndices.includes(index)}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="controls">
          <button className="btn" onClick={clearSelection}>Clear</button>
          <button className="btn" onClick={shuffleLetters}>Shuffle</button>
          <button className="btn primary" onClick={submitWord}>Submit</button>
          <button className="btn danger" onClick={endRound}>Give Up</button>
        </div>

        {foundFullWord && (
          <div className="next-level-hint">
            Full word found! You can advance when time runs out.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
