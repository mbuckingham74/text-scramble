import React from 'react';
import WordSlots from './WordSlots';

export default function GameOverScreen({
  score,
  level,
  foundWords,
  totalWords,
  wordsByLength,
  timedMode,
  leaderboard,
  leaderboardModal,
  user,
  onDismissModal,
  onPlayAgain,
  onViewLeaderboard
}) {
  const currentLeaderboard = timedMode ? leaderboard.timed : leaderboard.untimed;
  const userRank = user ? currentLeaderboard.findIndex(entry => entry.username === user.username && entry.score === score) + 1 : 0;
  const isOnLeaderboard = userRank > 0 && userRank <= 10;

  return (
    <div className="app">
      {leaderboardModal && (
        <div className="leaderboard-modal-overlay" onClick={onDismissModal}>
          <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-trophy">🏆</div>
            <h2>Congratulations!</h2>
            <p className="modal-message">You made the leaderboard!</p>
            <div className="modal-rank">#{leaderboardModal.rank}</div>
            <p className="modal-score">{leaderboardModal.score.toLocaleString()} points</p>
            <p className="modal-mode">{timedMode ? 'Timed' : 'Untimed'} Mode</p>
            <button className="btn primary" onClick={onDismissModal}>
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
          <button className="btn primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn leaderboard-btn" onClick={onViewLeaderboard}>
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
