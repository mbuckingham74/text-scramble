import React from 'react';
import WordSlots from './WordSlots';

export default function RoundEndScreen({
  foundWords,
  totalWords,
  wordsByLength,
  score,
  level,
  onNextLevel
}) {
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
        <button className="btn primary" onClick={onNextLevel}>
          Next Level
        </button>
      </div>
    </div>
  );
}
