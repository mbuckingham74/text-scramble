import React from 'react';
import LeaderboardList from './LeaderboardList';
import { LEVEL_THRESHOLDS } from '../constants';

export default function MenuScreen({
  user,
  leaderboard,
  apiError,
  soundEnabled,
  onClearApiError,
  onToggleSound,
  onLogin,
  onRegister,
  onLogout,
  onStartTimed,
  onStartUntimed,
  onAdmin
}) {
  return (
    <div className="app">
      {apiError && (
        <div className="api-error-banner">
          {apiError}
          <button className="dismiss-btn" onClick={onClearApiError}>×</button>
        </div>
      )}
      <div className="top-right-controls">
        <button className="admin-link" onClick={onAdmin}>Admin</button>
        <button className="sound-toggle-inline" onClick={onToggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
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
              <button className="link-btn" onClick={onLogout}>Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="btn secondary" onClick={onLogin}>Login</button>
              <button className="btn secondary" onClick={onRegister}>Register</button>
            </div>
          )}

          <div className="menu-buttons">
            <button className="btn primary" onClick={onStartTimed}>
              Timed Mode
            </button>
            <button className="btn secondary" onClick={onStartUntimed}>
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
