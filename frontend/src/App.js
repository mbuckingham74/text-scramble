import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import sounds from './sounds';
import {
  TIMER_DURATION,
  TIMER_WARNING_THRESHOLD,
  TIMER_CRITICAL_THRESHOLD,
  MIN_WORD_LENGTH,
  calculatePoints,
  LEVEL_THRESHOLDS
} from './constants';
import WordSlots from './components/WordSlots';
import LeaderboardList from './components/LeaderboardList';
import LeaderboardTable from './components/LeaderboardTable';
import LetterTile from './components/LetterTile';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

// Check if localStorage is available
const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

// Safe localStorage helpers
const safeGetJSON = (key) => {
  if (!storageAvailable) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked, ignore cleanup
    }
    return null;
  }
};

const safeSetItem = (key, value) => {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full, ignore
  }
};

const safeRemoveItem = (key) => {
  if (!storageAvailable) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage blocked, ignore
  }
};

// API helper with proper error handling
// - Always includes credentials for cross-origin cookie support
// - Calls onAuthError callback on 401 responses for centralized session expiry handling
const apiFetch = async (url, options = {}, onAuthError = null) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });
  if (!response.ok) {
    if (response.status === 401 && onAuthError) {
      onAuthError();
    }
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  // Handle 204 No Content or empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {};
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {};
};

function WordTwist() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gameState, setGameState] = useState('menu'); // menu, playing, roundEnd, gameOver, login, register, leaderboard
  const [letters, setLetters] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [currentWord, setCurrentWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [wordsByLength, setWordsByLength] = useState({});
  const [totalWords, setTotalWords] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [foundFullWord, setFoundFullWord] = useState(false);
  const [timedMode, setTimedMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auth state
  const [user, setUser] = useState(() => safeGetJSON('wordtwist_user'));
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState({ timed: [], untimed: [] });
  const [apiError, setApiError] = useState(''); // For surfacing API errors to users
  const [leaderboardModal, setLeaderboardModal] = useState(null); // { rank: number, score: number } when player makes leaderboard
  const [adminStats, setAdminStats] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [sessionId, setSessionId] = useState(null); // Server-side game session for score verification

  // Refs for stable references in callbacks
  const messageTimeoutRef = useRef(null);
  const gameStateRef = useRef({ score: 0, level: 1, foundWords: [], timedMode: true, user: null, sessionId: null });
  const timerRef = useRef(null);
  const warningPlayedRef = useRef(false);
  const criticalPlayedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    gameStateRef.current = { score, level, foundWords, timedMode, user, sessionId };
  }, [score, level, foundWords, timedMode, user, sessionId]);

  const showMessage = useCallback((text, type = 'info') => {
    // Clear any existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage(text);
    setMessageType(type);
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('');
      messageTimeoutRef.current = null;
    }, 1500);
  }, []);

  // Cleanup message timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const toggleSound = () => {
    const enabled = sounds.toggle();
    setSoundEnabled(enabled);
  };

  const handleLogin = async (username, password) => {
    setAuthError('');
    try {
      const data = await apiFetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (data.success) {
        const userData = { userId: data.userId, username: data.username };
        setUser(userData);
        safeSetItem('wordtwist_user', JSON.stringify(userData));
        setGameState('menu');
        navigate('/');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (error) {
      setAuthError(error.message || 'Login failed. Please try again.');
    }
  };

  const handleRegister = async (username, password) => {
    setAuthError('');
    try {
      const data = await apiFetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (data.success) {
        const userData = { userId: data.userId, username: data.username };
        setUser(userData);
        safeSetItem('wordtwist_user', JSON.stringify(userData));
        setGameState('menu');
        navigate('/');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (error) {
      setAuthError(error.message || 'Registration failed. Please try again.');
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch(`${API_URL}/logout`, { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    safeRemoveItem('wordtwist_user');
  }, []);

  const refreshAdminStats = useCallback(async () => {
    try {
      const stats = await apiFetch(`${API_URL}/admin/stats`);
      setAdminStats(stats);
      return true;
    } catch (error) {
      if (error.status === 401) {
        // Session expired or not logged in
        setAdminStats(null);
        return false;
      }
      console.error('Failed to refresh admin stats:', error);
    }
    return false;
  }, []);

  const handleAdminLogin = async (username, password) => {
    setAdminError('');
    try {
      // Login via POST - server sets httpOnly session cookie
      await apiFetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      // Fetch stats after successful login
      await refreshAdminStats();
      setGameState('admin');
    } catch (error) {
      if (error.status === 401) {
        setAdminError('Invalid admin credentials');
      } else {
        setAdminError(error.message || 'Failed to access admin panel');
      }
    }
  };

  const handleAdminLogout = async () => {
    try {
      await apiFetch(`${API_URL}/admin/logout`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
    setAdminStats(null);
    setGameState('menu');
    navigate('/');
  };

  // Handle 401 errors by logging out and showing error
  const handleAuthError = useCallback(() => {
    handleLogout();
    setApiError('Your session has expired. Please log in again.');
  }, [handleLogout]);

  // Wrapper around apiFetch that automatically handles 401 errors
  const authFetch = useCallback((url, options = {}) => {
    return apiFetch(url, options, handleAuthError);
  }, [handleAuthError]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await authFetch(`${API_URL}/leaderboard`);
      setLeaderboard({
        timed: data.timed || [],
        untimed: data.untimed || []
      });
      setApiError(''); // Clear any previous error on success
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setApiError('Failed to load leaderboard. Please refresh the page.');
    }
  }, [authFetch]);

  // Fetch leaderboard on initial load
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const submitScore = useCallback(async () => {
    const { user, sessionId: currentSessionId } = gameStateRef.current;
    if (!user) return;
    if (!currentSessionId) {
      console.error('No session ID for score submission');
      setApiError('Game session expired. Score not saved.');
      return;
    }
    try {
      await authFetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId })
      });
    } catch (error) {
      console.error('Failed to submit score:', error);
      // 401 errors are handled automatically by authFetch
      if (error.status !== 401) {
        setApiError('Failed to save your score. It may not appear on the leaderboard.');
      }
    }
  }, [authFetch]);

  const startNewRound = useCallback(async (timed = timedMode, puzzleLevel = 1) => {
    setApiError(''); // Clear errors when starting new round
    try {
      const mode = timed ? 'timed' : 'untimed';
      const data = await authFetch(`${API_URL}/puzzle?level=${puzzleLevel}&mode=${mode}`);

      setLetters(data.letters);
      setWordsByLength(data.wordsByLength);
      setTotalWords(data.totalWords);
      setSessionId(data.sessionId); // Store session for server-side score verification
      setFoundWords([]);
      setSelectedIndices([]);
      setCurrentWord('');
      setFoundFullWord(false);
      setTimeLeft(timed ? TIMER_DURATION : -1);
      setGameState('playing');
    } catch (error) {
      console.error('Failed to fetch puzzle:', error);
      setApiError('Failed to load puzzle. Please try again.');
      showMessage('Failed to load puzzle. Please try again.', 'error');
    }
  }, [timedMode, showMessage, authFetch]);

  const startGame = useCallback(async (timed = true) => {
    sounds.gameStart();
    setTimedMode(timed);
    setScore(0);
    setLevel(1);
    setLeaderboardModal(null); // Clear any previous leaderboard modal
    await fetchLeaderboard();
    await startNewRound(timed);
  }, [fetchLeaderboard, startNewRound]);

  // Handle URL-based routing on initial load or browser navigation
  const hasInitializedRoute = useRef(false);
  useEffect(() => {
    const path = location.pathname;

    // Handle route-based game starts
    if (path === '/timed' && gameState === 'menu') {
      startGame(true);
    } else if (path === '/untimed' && gameState === 'menu') {
      startGame(false);
    } else if (path === '/admin') {
      // Try to refresh admin stats - if session cookie is valid, it will succeed
      if (gameState !== 'admin' && gameState !== 'adminLogin') {
        refreshAdminStats().then(isLoggedIn => {
          if (isLoggedIn) {
            setGameState('admin');
          } else {
            setGameState('adminLogin');
          }
        });
      }
    } else if (path === '/' && hasInitializedRoute.current) {
      // Reset to menu when navigating back to root (after initial load)
      if (gameState !== 'menu' && gameState !== 'login' && gameState !== 'register' && gameState !== 'leaderboard') {
        setGameState('menu');
      }
    }

    hasInitializedRoute.current = true;
  }, [location.pathname, gameState, startGame, refreshAdminStats]);

  const shuffleLetters = useCallback(() => {
    sounds.shuffle();
    setLetters(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setSelectedIndices([]);
    setCurrentWord('');
  }, []);

  const selectLetter = useCallback((index) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) return prev;
      sounds.letterClick();
      return [...prev, index];
    });
    setCurrentWord(prev => {
      if (selectedIndices.includes(index)) return prev;
      return prev + letters[index];
    });
  }, [letters, selectedIndices]);

  const removeLetter = useCallback(() => {
    setSelectedIndices(prev => {
      if (prev.length === 0) return prev;
      sounds.letterRemove();
      return prev.slice(0, -1);
    });
    setCurrentWord(prev => prev.slice(0, -1));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIndices(prev => {
      if (prev.length > 0) sounds.clearLetters();
      return [];
    });
    setCurrentWord('');
  }, []);

  const submitWord = useCallback(async () => {
    if (currentWord.length < MIN_WORD_LENGTH) {
      sounds.wordInvalid();
      showMessage(`Words must be at least ${MIN_WORD_LENGTH} letters!`, 'error');
      clearSelection();
      return;
    }

    const upperWord = currentWord.toUpperCase();
    if (foundWords.includes(upperWord)) {
      sounds.wordDuplicate();
      showMessage('Already found!', 'error');
      clearSelection();
      return;
    }

    try {
      const { sessionId: currentSessionId } = gameStateRef.current;
      const data = await authFetch(`${API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: currentWord, sessionId: currentSessionId })
      });

      if (data.valid) {
        const word = data.word.toUpperCase(); // Ensure consistent casing
        setFoundWords(prev => [...prev, word]);

        // Use points from server if provided, otherwise calculate locally
        const points = data.points || calculatePoints(word.length);
        setScore(prev => prev + points);

        if (word.length === letters.length) {
          sounds.wordExcellent();
          setFoundFullWord(true);
          showMessage('EXCELLENT! Full word found!', 'success');
        } else {
          sounds.wordValid();
          showMessage(`+${points} points!`, 'success');
        }
      } else {
        sounds.wordInvalid();
        showMessage(data.error || 'Not a valid word!', 'error');
      }
    } catch (error) {
      console.error('Validation error:', error);
      showMessage('Error validating word', 'error');
    }

    clearSelection();
  }, [currentWord, foundWords, letters, showMessage, clearSelection, authFetch]);

  const endRound = useCallback(async () => {
    if (foundFullWord) {
      sounds.levelComplete();
      setGameState('roundEnd');
    } else {
      sounds.gameOver();
      const { score, timedMode, user } = gameStateRef.current;
      await submitScore();

      // Fetch updated leaderboard and check if player made it
      try {
        const data = await authFetch(`${API_URL}/leaderboard`);
        const updatedLeaderboard = {
          timed: data.timed || [],
          untimed: data.untimed || []
        };
        setLeaderboard(updatedLeaderboard);

        // Check if this player's score is on the leaderboard
        if (user && score > 0) {
          const relevantBoard = timedMode ? updatedLeaderboard.timed : updatedLeaderboard.untimed;
          const playerEntry = relevantBoard.find(
            entry => entry.username === user.username && entry.score === score
          );
          if (playerEntry) {
            const rank = relevantBoard.indexOf(playerEntry) + 1;
            setLeaderboardModal({ rank, score });
          }
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }

      setGameState('gameOver');
    }
  }, [foundFullWord, submitScore, authFetch]);

  // Timer effect - single interval, sounds play once per threshold crossing
  useEffect(() => {
    // Reset sound flags when starting a new game
    warningPlayedRef.current = false;
    criticalPlayedRef.current = false;

    // Only run timer in timed mode while playing
    if (gameState !== 'playing' || !timedMode) {
      return;
    }

    // Start a single interval
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) return t; // Don't go negative

        const newTime = t - 1;

        // Play warning sound once when crossing threshold
        if (newTime <= TIMER_WARNING_THRESHOLD && newTime > TIMER_CRITICAL_THRESHOLD && !warningPlayedRef.current) {
          sounds.timerTick();
          warningPlayedRef.current = true;
        }

        // Play critical sound once when crossing threshold
        if (newTime <= TIMER_CRITICAL_THRESHOLD && newTime > 0 && !criticalPlayedRef.current) {
          sounds.timerCritical();
          criticalPlayedRef.current = true;
        }

        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, timedMode]);

  // Handle timer expiry separately to avoid stale closure
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      endRound();
    }
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
  }, [gameState, letters, selectedIndices, submitWord, removeLetter, shuffleLetters, clearSelection, selectLetter]);

  const formatTime = (seconds) => {
    if (seconds === -1) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <button className="btn secondary" onClick={() => navigate('/')}>Back</button>
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
            <input type="password" name="password" placeholder="Password (8+ chars, mixed case + number)" required minLength="8" />
            <button type="submit" className="btn primary">Register</button>
          </form>
          <p className="auth-switch">
            Already have an account?{' '}
            <button className="link-btn" onClick={() => { setAuthError(''); setGameState('login'); }}>Login</button>
          </p>
          <button className="btn secondary" onClick={() => navigate('/')}>Back</button>
        </div>
      </div>
    );
  }

  // Admin login screen
  if (gameState === 'adminLogin') {
    return (
      <div className="app">
        <div className="auth-form">
          <h1>Admin Login</h1>
          {adminError && <p className="auth-error">{adminError}</p>}
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target;
            handleAdminLogin(form.username.value, form.password.value);
          }}>
            <input type="text" name="username" placeholder="Admin Username" required />
            <input type="password" name="password" placeholder="Admin Password" required />
            <button type="submit" className="btn primary">Login</button>
          </form>
          <button className="btn secondary" onClick={() => { setAdminError(''); navigate('/'); }}>Back</button>
        </div>
      </div>
    );
  }

  // Admin dashboard screen
  if (gameState === 'admin') {
    return (
      <div className="app">
        <div className="admin-dashboard">
          <h1>Word Twist Admin Dashboard</h1>
          {adminStats && (
            <>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="stat-value">{adminStats.userCount.toLocaleString()}</div>
                  <div className="stat-label">Registered Users</div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-value">{adminStats.gamesPlayed.toLocaleString()}</div>
                  <div className="stat-label">Total Games Played</div>
                </div>
                <div className="admin-stat-card">
                  <div className="stat-value">{adminStats.totalWordsGuessed.toLocaleString()}</div>
                  <div className="stat-label">Words Correctly Guessed</div>
                </div>
              </div>
              <div className="admin-stats-grid">
                <div className="admin-stat-card secondary">
                  <div className="stat-value">{adminStats.timedGames.toLocaleString()}</div>
                  <div className="stat-label">Timed Games</div>
                </div>
                <div className="admin-stat-card secondary">
                  <div className="stat-value">{adminStats.untimedGames.toLocaleString()}</div>
                  <div className="stat-label">Untimed Games</div>
                </div>
              </div>
              <div className="admin-stats-grid">
                <div className="admin-stat-card highlight">
                  <div className="stat-value">{adminStats.recentUsers.toLocaleString()}</div>
                  <div className="stat-label">New Users (7 days)</div>
                </div>
                <div className="admin-stat-card highlight">
                  <div className="stat-value">{adminStats.recentGames.toLocaleString()}</div>
                  <div className="stat-label">Recent Games (7 days)</div>
                </div>
              </div>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="stat-value">{adminStats.dictionarySize?.toLocaleString() || '—'}</div>
                  <div className="stat-label">Words in Dictionary</div>
                </div>
              </div>
            </>
          )}
          <div className="admin-buttons">
            <button className="btn secondary" onClick={refreshAdminStats}>Refresh</button>
            <button className="btn primary" onClick={() => navigate('/')}>Back to Game</button>
            <button className="btn danger" onClick={() => { handleAdminLogout(); navigate('/'); }}>Logout</button>
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard screen
  if (gameState === 'leaderboard') {
    return (
      <div className="app">
        <div className="leaderboard-screen wide">
          <h1>Leaderboards</h1>
          <div className="leaderboard-tables">
            <LeaderboardTable entries={leaderboard.timed} title="Timed Mode" currentUser={user} />
            <LeaderboardTable entries={leaderboard.untimed} title="Untimed Mode" currentUser={user} />
          </div>
          <button className="btn primary" onClick={() => navigate('/')}>Back to Menu</button>
        </div>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="app">
        {apiError && (
          <div className="api-error-banner">
            {apiError}
            <button className="dismiss-btn" onClick={() => setApiError('')}>×</button>
          </div>
        )}
        <div className="top-right-controls">
          <button className="admin-link" onClick={() => navigate('/admin')}>Admin</button>
          <button className="sound-toggle-inline" onClick={toggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="menu-layout">
          <div className="menu-title">
            <h1>Word Twist</h1>
            <p className="subtitle">Unscramble letters to find words!</p>
          </div>

          <div className="menu-controls">
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
              <button className="btn primary" onClick={() => { navigate('/timed'); startGame(true); }}>
                Timed Mode
              </button>
              <button className="btn secondary" onClick={() => { navigate('/untimed'); startGame(false); }}>
                Untimed Mode
              </button>
            </div>
          </div>

          <div className="menu-content">
            <div className="instructions">
              <h3>How to Play</h3>
              <ul>
                <li>Click letters or type to form words</li>
                <li>Press <kbd>Enter</kbd> to submit</li>
                <li>Press <kbd>Space</kbd> to shuffle</li>
                <li>Press <kbd>Backspace</kbd> to delete</li>
                <li>Press <kbd>Tab</kbd> to clear</li>
                <li>Find a full-length word to advance!</li>
                {!user && <li><em>Login to save your scores!</em></li>}
              </ul>
            </div>

            <div className="instructions">
              <h3>Difficulty</h3>
              <ul>
                <li><strong>Levels 1-{LEVEL_THRESHOLDS.SIX_LETTERS.maxLevel}:</strong> {LEVEL_THRESHOLDS.SIX_LETTERS.letterCount} letters</li>
                <li><strong>Levels {LEVEL_THRESHOLDS.SIX_LETTERS.maxLevel + 1}-{LEVEL_THRESHOLDS.SEVEN_LETTERS.maxLevel}:</strong> {LEVEL_THRESHOLDS.SEVEN_LETTERS.letterCount} letters</li>
                <li><strong>Levels {LEVEL_THRESHOLDS.SEVEN_LETTERS.maxLevel + 1}+:</strong> {LEVEL_THRESHOLDS.EIGHT_LETTERS.letterCount} letters</li>
              </ul>
              <p className="difficulty-note">Find longer words for more points!</p>
            </div>

            <LeaderboardList entries={leaderboard.timed} title="Timed" currentUser={user} />

            <LeaderboardList entries={leaderboard.untimed} title="Untimed" currentUser={user} />
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
            <p>Score: {score.toLocaleString()}</p>
            <p>Level: {level}</p>
          </div>
          <div className="all-words">
            <h2>All Words</h2>
            <WordSlots wordsByLength={wordsByLength} foundWords={foundWords} revealAll />
          </div>
          <button
            className="btn primary"
            onClick={() => {
              const newLevel = level + 1;
              setLevel(newLevel);
              startNewRound(timedMode, newLevel);
            }}
          >
            Next Level
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    const currentLeaderboard = timedMode ? leaderboard.timed : leaderboard.untimed;
    const userRank = user ? currentLeaderboard.findIndex(entry => entry.username === user.username && entry.score === score) + 1 : 0;
    const isOnLeaderboard = userRank > 0 && userRank <= 10;

    return (
      <div className="app">
        {leaderboardModal && (
          <div className="leaderboard-modal-overlay" onClick={() => setLeaderboardModal(null)}>
            <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-trophy">🏆</div>
              <h2>Congratulations!</h2>
              <p className="modal-message">You made the leaderboard!</p>
              <div className="modal-rank">#{leaderboardModal.rank}</div>
              <p className="modal-score">{leaderboardModal.score.toLocaleString()} points</p>
              <p className="modal-mode">{timedMode ? 'Timed' : 'Untimed'} Mode</p>
              <button className="btn primary" onClick={() => setLeaderboardModal(null)}>
                Awesome!
              </button>
            </div>
          </div>
        )}
        <div className="game-over">
          <h1>Game Over!</h1>
          <p className="reason">You need to find at least one full-length word to continue!</p>
          <div className="stats">
            <p>Final Score: {score.toLocaleString()}</p>
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
            <WordSlots wordsByLength={wordsByLength} foundWords={foundWords} revealAll />
          </div>
          <div className="game-over-buttons">
            <button className="btn primary" onClick={() => navigate('/')}>
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
            <div className="header-left">
              <h1 className="game-logo">Word Twist</h1>
              <button className="sound-toggle-small" onClick={toggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            <div className="header-stats">
              <div className="stat">
                <span className="label">Level</span>
                <span className="value">{level}</span>
              </div>
              <div className="stat">
                <span className="label">Score</span>
                <span className="value">{score.toLocaleString()}</span>
              </div>
              <div className={`stat timer ${timeLeft <= TIMER_WARNING_THRESHOLD && timeLeft > 0 ? 'warning' : ''}`}>
                <span className="label">Time</span>
                <span className="value">{formatTime(timeLeft)}</span>
              </div>
              <div className="stat">
                <span className="label">Found</span>
                <span className="value">{foundWords.length}/{totalWords}</span>
              </div>
            </div>
          </header>

          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <div className="word-display">
            <WordSlots wordsByLength={wordsByLength} foundWords={foundWords} />
          </div>

          <div className="current-word">
            <div className="word-box">
              {currentWord || '\u00A0'}
            </div>
          </div>

          <div className="letter-rack">
            {letters.map((letter, index) => (
              <LetterTile
                key={index}
                letter={letter}
                selected={selectedIndices.includes(index)}
                onClick={() => selectLetter(index)}
              />
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

        <LeaderboardList
          entries={timedMode ? leaderboard.timed : leaderboard.untimed}
          title={`${timedMode ? 'Timed' : 'Untimed'} Top 10`}
          currentUser={user}
          className="leaderboard-sidebar"
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<WordTwist />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
