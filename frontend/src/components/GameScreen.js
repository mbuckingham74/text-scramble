import React from 'react';
import WordSlots from './WordSlots';
import LeaderboardList from './LeaderboardList';
import LetterTile from './LetterTile';
import { TIMER_WARNING_THRESHOLD } from '../constants';

export default function GameScreen({
  letters,
  selectedIndices,
  currentWord,
  foundWords,
  wordsByLength,
  totalWords,
  score,
  level,
  timeLeft,
  timedMode,
  foundFullWord,
  message,
  messageType,
  soundEnabled,
  leaderboard,
  user,
  onSelectLetter,
  onClearSelection,
  onShuffleLetters,
  onSubmitWord,
  onEndRound,
  onToggleSound,
  formatTime
}) {
  return (
    <div className="app">
      <div className="game-layout">
        <div className="game">
          <header className="game-header">
            <div className="header-left">
              <h1 className="game-logo">Word Twist</h1>
              <button className="sound-toggle-small" onClick={onToggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
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
                onClick={() => onSelectLetter(index)}
              />
            ))}
          </div>

          <div className="controls">
            <button className="btn" onClick={onClearSelection}>Clear</button>
            <button className="btn" onClick={onShuffleLetters}>Shuffle</button>
            <button className="btn primary" onClick={onSubmitWord}>Submit</button>
            <button className="btn danger" onClick={onEndRound}>Give Up</button>
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
