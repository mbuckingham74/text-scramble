import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import sounds from './sounds';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing, roundEnd, gameOver, login, register, leaderboard
  const [letters, setLetters] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
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

  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wordtwist_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 1500);
  };

  const toggleSound = () => {
    const enabled = sounds.toggle();
    setSoundEnabled(enabled);
  };

  const handleLogin = async (username, password) => {
    setAuthError('');
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        const userData = { userId: data.userId, username: data.username };
        setUser(userData);
        localStorage.setItem('wordtwist_user', JSON.stringify(userData));
        setGameState('menu');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (error) {
      setAuthError('Login failed. Please try again.');
    }
  };

  const handleRegister = async (username, password) => {
    setAuthError('');
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        const userData = { userId: data.userId, username: data.username };
        setUser(userData);
        localStorage.setItem('wordtwist_user', JSON.stringify(userData));
        setGameState('menu');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (error) {
      setAuthError('Registration failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wordtwist_user');
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  // Fetch leaderboard on initial load
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const submitScore = async () => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          score,
          level,
          wordsFound: foundWords.length,
          gameMode: timedMode ? 'timed' : 'untimed'
        })
      });
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  const startGame = async (timed = true) => {
    sounds.gameStart();
    setTimedMode(timed);
    setScore(0);
    setLevel(1);
    await fetchLeaderboard();  // Fetch leaderboard when game starts
    await startNewRound(timed);
  };

  const startNewRound = async (timed = timedMode) => {
    try {
      const response = await fetch(`${API_URL}/puzzle`);
      const data = await response.json();

      setLetters(data.letters);
      setWordsByLength(data.wordsByLength);
      setTotalWords(data.totalWords);
      setFoundWords([]);
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

    if (foundWords.includes(currentWord.toUpperCase())) {
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
        setFoundWords([...foundWords, data.word]);

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
      await submitScore();
      await fetchLeaderboard();  // Always fetch so View Leaderboard works
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
                className={`word-slot ${foundWords.includes(word) ? 'found' : ''}`}
              >
                {foundWords.includes(word) ? word : word.replace(/./g, '_')}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return slots;
  };

  // Render end screen word list (shows all words in slots with found/missed styling)
  const renderAllWords = () => {
    const lengths = Object.keys(wordsByLength).sort((a, b) => a - b);
    return lengths.map(length => (
      <div key={length} className="word-group">
        <h3>{length} Letters</h3>
        <div className="word-slots">
          {wordsByLength[length].map((word, idx) => (
            <div
              key={idx}
              className={`word-slot ${foundWords.includes(word) ? 'found' : 'missed'}`}
            >
              {word}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  // Login screen
  if (gameState === 'login') {
    return (
      <div className="app">
        <div className="auth-form">
          <h1>Login</h1>
          {authError && <p className="auth-error">{authError}</p>}
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target;
            handleLogin(form.username.value, form.password.value);
          }}>
            <input type="text" name="username" placeholder="Username" required />
            <input type="password" name="password" placeholder="Password" required />
            <button type="submit" className="btn primary">Login</button>
          </form>
          <p className="auth-switch">
            Don't have an account?{' '}
            <button className="link-btn" onClick={() => { setAuthError(''); setGameState('register'); }}>Register</button>
          </p>
          <button className="btn secondary" onClick={() => setGameState('menu')}>Back</button>
        </div>
      </div>
    );
  }

  // Register screen
  if (gameState === 'register') {
    return (
      <div className="app">
        <div className="auth-form">
          <h1>Register</h1>
          {authError && <p className="auth-error">{authError}</p>}
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target;
            handleRegister(form.username.value, form.password.value);
          }}>
            <input type="text" name="username" placeholder="Username (3-20 chars)" required />
            <input type="password" name="password" placeholder="Password (4+ chars)" required />
            <button type="submit" className="btn primary">Register</button>
          </form>
          <p className="auth-switch">
            Already have an account?{' '}
            <button className="link-btn" onClick={() => { setAuthError(''); setGameState('login'); }}>Login</button>
          </p>
          <button className="btn secondary" onClick={() => setGameState('menu')}>Back</button>
        </div>
      </div>
    );
  }

  // Leaderboard screen
  if (gameState === 'leaderboard') {
    return (
      <div className="app">
        <div className="leaderboard-screen">
          <h1>Leaderboard</h1>
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <p className="no-scores">No scores yet. Be the first!</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.id} className={user && entry.username === user.username ? 'current-user' : ''}>
                      <td>{idx + 1}</td>
                      <td>{entry.username}</td>
                      <td>{entry.score}</td>
                      <td>{entry.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button className="btn primary" onClick={() => setGameState('menu')}>Back to Menu</button>
        </div>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="app">
        <div className="menu-layout">
          <div className="menu">
            <button className="sound-toggle" onClick={toggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <h1>Word Twist</h1>
            <p className="subtitle">Unscramble letters to find words!</p>

            {user ? (
              <div className="user-info">
                <span>Welcome, <strong>{user.username}</strong>!</span>
                <button className="link-btn" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="btn secondary" onClick={() => setGameState('login')}>Login</button>
                <button className="btn secondary" onClick={() => setGameState('register')}>Register</button>
              </div>
            )}

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
                {!user && <li><em>Login to save your scores!</em></li>}
              </ul>
            </div>
          </div>

          <div className="menu-leaderboard">
            <h2>Top 10</h2>
            {leaderboard.length === 0 ? (
              <p className="no-scores">No scores yet. Be the first!</p>
            ) : (
              <ol className="menu-leaderboard-list">
                {leaderboard.map((entry, idx) => (
                  <li key={entry.id} className={user && entry.username === user.username ? 'current-user' : ''}>
                    <span className="rank">{idx + 1}.</span>
                    <span className="name">{entry.username}</span>
                    <span className="score">{entry.score}</span>
                  </li>
                ))}
              </ol>
            )}
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
            <p>Words Found: {foundWords.length} / {totalWords}</p>
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
    const userRank = user ? leaderboard.findIndex(entry => entry.username === user.username && entry.score === score) + 1 : 0;
    const isOnLeaderboard = userRank > 0 && userRank <= 10;

    return (
      <div className="app">
        <div className="game-over">
          <h1>Game Over!</h1>
          <p className="reason">You need to find at least one 6-letter word to continue!</p>
          <div className="stats">
            <p>Final Score: {score}</p>
            <p>Levels Completed: {level - 1}</p>
            <p>Words Found This Round: {foundWords.length} / {totalWords}</p>
            {user && isOnLeaderboard && (
              <p className="leaderboard-rank">You made the leaderboard at #{userRank}!</p>
            )}
            {user && !isOnLeaderboard && score > 0 && (
              <p className="leaderboard-miss">Score submitted! Keep playing to reach the top 10.</p>
            )}
            {!user && (
              <p className="login-prompt">Login to save your scores to the leaderboard!</p>
            )}
          </div>
          <div className="all-words">
            <h2>All Words</h2>
            {renderAllWords()}
          </div>
          <div className="game-over-buttons">
            <button className="btn primary" onClick={() => setGameState('menu')}>
              Play Again
            </button>
            <button className="btn leaderboard-btn" onClick={() => setGameState('leaderboard')}>
              View Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-layout">
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
              <span className="value">{foundWords.length}/{totalWords}</span>
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

        <aside className="leaderboard-sidebar">
          <h3>Top 10</h3>
          {leaderboard.length === 0 ? (
            <p className="no-scores">No scores yet!</p>
          ) : (
            <ol className="sidebar-leaderboard">
              {leaderboard.map((entry, idx) => (
                <li key={entry.id} className={user && entry.username === user.username ? 'current-user' : ''}>
                  <span className="rank">{idx + 1}.</span>
                  <span className="name">{entry.username}</span>
                  <span className="score">{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
