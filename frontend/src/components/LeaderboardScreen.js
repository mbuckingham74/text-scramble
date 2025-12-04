import React from 'react';
import LeaderboardTable from './LeaderboardTable';

export default function LeaderboardScreen({ leaderboard, user, onBack }) {
  return (
    <div className="app">
      <div className="leaderboard-screen wide">
        <h1>Leaderboards</h1>
        <div className="leaderboard-tables">
          <LeaderboardTable entries={leaderboard.timed} title="Timed Mode" currentUser={user} />
          <LeaderboardTable entries={leaderboard.untimed} title="Untimed Mode" currentUser={user} />
        </div>
        <button className="btn primary" onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
}
