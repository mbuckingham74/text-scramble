import React from 'react';

/**
 * Full leaderboard table with date and level columns.
 * Used on the dedicated leaderboard screen.
 *
 * @param {Array} entries - Leaderboard entries with id, username, score, level, created_at
 * @param {string} title - Section title (e.g., "Timed Mode", "Untimed Mode")
 * @param {Object} currentUser - Current logged-in user (for highlighting)
 */
function LeaderboardTable({ entries, title, currentUser }) {
  return (
    <div className="leaderboard-section">
      <h2>{title}</h2>
      {entries.length === 0 ? (
        <p className="no-scores">No scores yet. Be the first!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Score</th>
              <th>Level</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry.id}
                className={currentUser && entry.username === currentUser.username ? 'current-user' : ''}
              >
                <td>{idx + 1}</td>
                <td>{entry.username}</td>
                <td>{entry.score.toLocaleString()}</td>
                <td>{entry.level}</td>
                <td>{new Date(entry.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LeaderboardTable;
