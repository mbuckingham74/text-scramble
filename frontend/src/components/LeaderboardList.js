import React from 'react';

/**
 * Compact leaderboard list for menu and sidebar display.
 *
 * @param {Array} entries - Leaderboard entries with id, username, score
 * @param {string} title - Section title (e.g., "Timed", "Untimed")
 * @param {Object} currentUser - Current logged-in user (for highlighting)
 * @param {string} className - Optional wrapper class name (default: 'menu-leaderboard')
 */
function LeaderboardList({ entries, title, currentUser, className = 'menu-leaderboard' }) {
  const isSidebar = className === 'leaderboard-sidebar';
  const TitleTag = isSidebar ? 'h3' : 'h2';
  const listClass = isSidebar ? 'sidebar-leaderboard' : 'menu-leaderboard-list';
  const Wrapper = isSidebar ? 'aside' : 'div';

  return (
    <Wrapper className={className}>
      <TitleTag>{title}</TitleTag>
      {entries.length === 0 ? (
        <p className="no-scores">No scores yet!</p>
      ) : (
        <ol className={listClass}>
          {entries.map((entry, idx) => (
            <li
              key={entry.id}
              className={currentUser && entry.username === currentUser.username ? 'current-user' : ''}
            >
              <span className="rank">{idx + 1}.</span>
              <span className="name">{entry.username}</span>
              <span className="score">{entry.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </Wrapper>
  );
}

export default LeaderboardList;
