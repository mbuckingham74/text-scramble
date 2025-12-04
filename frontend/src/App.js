import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import sounds, { SoundEffects } from './sounds';
import {
  TIMER_DURATION,
  TIMER_WARNING_THRESHOLD,
  TIMER_CRITICAL_THRESHOLD,
  MIN_WORD_LENGTH,
  calculatePoints
} from './constants';

// Utils
import { storageAvailable, safeGetJSON, safeSetItem, safeRemoveItem } from './utils/storage';
import { API_URL, apiFetch } from './utils/api';

// Screen components
import { LoginForm, RegisterForm, AdminLoginForm } from './components/AuthForms';
import AdminDashboard from './components/AdminDashboard';
import MenuScreen from './components/MenuScreen';
import GameScreen from './components/GameScreen';
import RoundEndScreen from './components/RoundEndScreen';
import GameOverScreen from './components/GameOverScreen';
import LeaderboardScreen from './components/LeaderboardScreen';

function WordTwist() {
  const navigate = useNavigate();
  const location = useLocation();

  // Game state
  const [gameState, setGameState] = useState('menu');
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
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (storageAvailable) {
      const saved = localStorage.getItem('wordtwist_sound');
      if (saved !== null) {
        const enabled = saved === 'true';
        sounds.setEnabled(enabled);
        return enabled;
      }
    }
    if (SoundEffects.prefersReducedMotion()) {
      sounds.setEnabled(false);
      return false;
    }
    return true;
  });

  // Auth state
  const [user, setUser] = useState(() => safeGetJSON('wordtwist_user'));
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState({ timed: [], untimed: [] });
  const [apiError, setApiError] = useState('');
  const [leaderboardModal, setLeaderboardModal] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [sessionId, setSessionId] = useState(null);

  // Refs for stable references in callbacks
  const messageTimeoutRef = useRef(null);
  const gameStateRef = useRef({ score: 0, level: 1, foundWords: [], timedMode: true, user: null, sessionId: null });
  const timerRef = useRef(null);
  const warningPlayedRef = useRef(false);
  const criticalPlayedRef = useRef(false);
  const lettersRef = useRef([]);
  const selectedIndicesRef = useRef([]);
  const currentWordRef = useRef('');
  const foundWordsRef = useRef([]);

  // Keep refs in sync with state
  useEffect(() => {
    gameStateRef.current = { score, level, foundWords, timedMode, user, sessionId };
  }, [score, level, foundWords, timedMode, user, sessionId]);

  useEffect(() => { lettersRef.current = letters; }, [letters]);
  useEffect(() => { selectedIndicesRef.current = selectedIndices; }, [selectedIndices]);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);
  useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);

  // Message display
  const showMessage = useCallback((text, type = 'info') => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage(text);
    setMessageType(type);
    messageTimeoutRef.current = setTimeout(() => {
      setMessage('');
      messageTimeoutRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => { if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current); };
  }, []);

  // Sound toggle
  const toggleSound = () => {
    const enabled = sounds.toggle();
    setSoundEnabled(enabled);
    safeSetItem('wordtwist_sound', enabled.toString());
  };

  // Auth handlers
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

  // Admin handlers
  const refreshAdminStats = useCallback(async () => {
    try {
      const stats = await apiFetch(`${API_URL}/admin/stats`);
      setAdminStats(stats);
      return true;
    } catch (error) {
      if (error.status === 401) {
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
      await apiFetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
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

  // Auth error handling
  const handleAuthError = useCallback(() => {
    handleLogout();
    setApiError('Your session has expired. Please log in again.');
  }, [handleLogout]);

  const authFetch = useCallback((url, options = {}) => {
    return apiFetch(url, options, handleAuthError);
  }, [handleAuthError]);

  // Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await authFetch(`${API_URL}/leaderboard`);
      setLeaderboard({ timed: data.timed || [], untimed: data.untimed || [] });
      setApiError('');
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setApiError('Failed to load leaderboard. Please refresh the page.');
    }
  }, [authFetch]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Score submission
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
      if (error.status !== 401) {
        setApiError('Failed to save your score. It may not appear on the leaderboard.');
      }
    }
  }, [authFetch]);

  // Game flow
  const startNewRound = useCallback(async (timed = timedMode, puzzleLevel = 1) => {
    setApiError('');
    try {
      const mode = timed ? 'timed' : 'untimed';
      const data = await authFetch(`${API_URL}/puzzle?level=${puzzleLevel}&mode=${mode}`);
      setLetters(data.letters);
      setWordsByLength(data.wordsByLength);
      setTotalWords(data.totalWords);
      setSessionId(data.sessionId);
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
    setLeaderboardModal(null);
    await fetchLeaderboard();
    await startNewRound(timed);
  }, [fetchLeaderboard, startNewRound]);

  // URL routing
  const hasInitializedRoute = useRef(false);
  useEffect(() => {
    const path = location.pathname;
    if (path === '/timed' && gameState === 'menu') {
      startGame(true);
    } else if (path === '/untimed' && gameState === 'menu') {
      startGame(false);
    } else if (path === '/admin') {
      if (gameState !== 'admin' && gameState !== 'adminLogin') {
        refreshAdminStats().then(isLoggedIn => {
          setGameState(isLoggedIn ? 'admin' : 'adminLogin');
        });
      }
    } else if (path === '/' && hasInitializedRoute.current) {
      if (gameState !== 'menu' && gameState !== 'login' && gameState !== 'register' && gameState !== 'leaderboard') {
        setGameState('menu');
      }
    }
    hasInitializedRoute.current = true;
  }, [location.pathname, gameState, startGame, refreshAdminStats]);

  // Game actions
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
      if (selectedIndicesRef.current.includes(index)) return prev;
      return prev + lettersRef.current[index];
    });
  }, []);

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
    const word = currentWordRef.current;
    const found = foundWordsRef.current;
    const currentLetters = lettersRef.current;

    if (word.length < MIN_WORD_LENGTH) {
      sounds.wordInvalid();
      showMessage(`Words must be at least ${MIN_WORD_LENGTH} letters!`, 'error');
      clearSelection();
      return;
    }

    const upperWord = word.toUpperCase();
    if (found.includes(upperWord)) {
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
        body: JSON.stringify({ word, sessionId: currentSessionId })
      });

      if (data.valid) {
        const validWord = data.word.toUpperCase();
        setFoundWords(prev => [...prev, validWord]);
        const points = data.points || calculatePoints(validWord.length);
        setScore(prev => prev + points);

        if (validWord.length === currentLetters.length) {
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
  }, [showMessage, clearSelection, authFetch]);

  const endRound = useCallback(async () => {
    if (foundFullWord) {
      sounds.levelComplete();
      setGameState('roundEnd');
    } else {
      sounds.gameOver();
      const { score, timedMode, user } = gameStateRef.current;
      await submitScore();

      try {
        const data = await authFetch(`${API_URL}/leaderboard`);
        const updatedLeaderboard = { timed: data.timed || [], untimed: data.untimed || [] };
        setLeaderboard(updatedLeaderboard);

        if (user && score > 0) {
          const relevantBoard = timedMode ? updatedLeaderboard.timed : updatedLeaderboard.untimed;
          const playerEntry = relevantBoard.find(entry => entry.username === user.username && entry.score === score);
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

  // Timer effect
  useEffect(() => {
    warningPlayedRef.current = false;
    criticalPlayedRef.current = false;

    if (gameState !== 'playing' || !timedMode) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) return t;
        const newTime = t - 1;
        if (newTime <= TIMER_WARNING_THRESHOLD && newTime > TIMER_CRITICAL_THRESHOLD && !warningPlayedRef.current) {
          sounds.timerTick();
          warningPlayedRef.current = true;
        }
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

  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) endRound();
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
        const currentLetters = lettersRef.current;
        const currentSelected = selectedIndicesRef.current;
        const index = currentLetters.findIndex((l, i) => l.toUpperCase() === letter && !currentSelected.includes(i));
        if (index !== -1) selectLetter(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, submitWord, removeLetter, shuffleLetters, clearSelection, selectLetter]);

  const formatTime = (seconds) => {
    if (seconds === -1) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render screens based on game state
  if (gameState === 'login') {
    return (
      <LoginForm
        onLogin={handleLogin}
        onRegister={() => { setAuthError(''); setGameState('register'); }}
        onBack={() => navigate('/')}
        error={authError}
      />
    );
  }

  if (gameState === 'register') {
    return (
      <RegisterForm
        onRegister={handleRegister}
        onLogin={() => { setAuthError(''); setGameState('login'); }}
        onBack={() => navigate('/')}
        error={authError}
      />
    );
  }

  if (gameState === 'adminLogin') {
    return (
      <AdminLoginForm
        onLogin={handleAdminLogin}
        onBack={() => { setAdminError(''); navigate('/'); }}
        error={adminError}
      />
    );
  }

  if (gameState === 'admin') {
    return (
      <AdminDashboard
        stats={adminStats}
        onRefresh={refreshAdminStats}
        onBack={() => navigate('/')}
        onLogout={() => { handleAdminLogout(); navigate('/'); }}
      />
    );
  }

  if (gameState === 'leaderboard') {
    return (
      <LeaderboardScreen
        leaderboard={leaderboard}
        user={user}
        onBack={() => navigate('/')}
      />
    );
  }

  if (gameState === 'menu') {
    return (
      <MenuScreen
        user={user}
        leaderboard={leaderboard}
        apiError={apiError}
        soundEnabled={soundEnabled}
        onClearApiError={() => setApiError('')}
        onToggleSound={toggleSound}
        onLogin={() => setGameState('login')}
        onRegister={() => setGameState('register')}
        onLogout={handleLogout}
        onStartTimed={() => { navigate('/timed'); startGame(true); }}
        onStartUntimed={() => { navigate('/untimed'); startGame(false); }}
        onAdmin={() => navigate('/admin')}
      />
    );
  }

  if (gameState === 'roundEnd') {
    return (
      <RoundEndScreen
        foundWords={foundWords}
        totalWords={totalWords}
        wordsByLength={wordsByLength}
        score={score}
        level={level}
        onNextLevel={() => {
          const newLevel = level + 1;
          setLevel(newLevel);
          startNewRound(timedMode, newLevel);
        }}
      />
    );
  }

  if (gameState === 'gameOver') {
    return (
      <GameOverScreen
        score={score}
        level={level}
        foundWords={foundWords}
        totalWords={totalWords}
        wordsByLength={wordsByLength}
        timedMode={timedMode}
        leaderboard={leaderboard}
        leaderboardModal={leaderboardModal}
        user={user}
        onDismissModal={() => setLeaderboardModal(null)}
        onPlayAgain={() => navigate('/')}
        onViewLeaderboard={() => setGameState('leaderboard')}
      />
    );
  }

  // Playing state
  return (
    <GameScreen
      letters={letters}
      selectedIndices={selectedIndices}
      currentWord={currentWord}
      foundWords={foundWords}
      wordsByLength={wordsByLength}
      totalWords={totalWords}
      score={score}
      level={level}
      timeLeft={timeLeft}
      timedMode={timedMode}
      foundFullWord={foundFullWord}
      message={message}
      messageType={messageType}
      soundEnabled={soundEnabled}
      leaderboard={leaderboard}
      user={user}
      onSelectLetter={selectLetter}
      onClearSelection={clearSelection}
      onShuffleLetters={shuffleLetters}
      onSubmitWord={submitWord}
      onEndRound={endRound}
      onToggleSound={toggleSound}
      formatTime={formatTime}
    />
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
