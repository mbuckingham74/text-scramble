import React from 'react';

export default function AdminDashboard({ stats, onRefresh, onBack, onLogout }) {
  return (
    <div className="app">
      <div className="admin-dashboard">
        <h1>Word Twist Admin Dashboard</h1>
        {stats && (
          <>
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="stat-value">{stats.userCount.toLocaleString()}</div>
                <div className="stat-label">Registered Users</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-value">{stats.gamesPlayed.toLocaleString()}</div>
                <div className="stat-label">Total Games Played</div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-value">{stats.totalWordsGuessed.toLocaleString()}</div>
                <div className="stat-label">Words Correctly Guessed</div>
              </div>
            </div>
            <div className="admin-stats-grid">
              <div className="admin-stat-card secondary">
                <div className="stat-value">{stats.timedGames.toLocaleString()}</div>
                <div className="stat-label">Timed Games</div>
              </div>
              <div className="admin-stat-card secondary">
                <div className="stat-value">{stats.untimedGames.toLocaleString()}</div>
                <div className="stat-label">Untimed Games</div>
              </div>
            </div>
            <div className="admin-stats-grid">
              <div className="admin-stat-card highlight">
                <div className="stat-value">{stats.recentUsers.toLocaleString()}</div>
                <div className="stat-label">New Users (7 days)</div>
              </div>
              <div className="admin-stat-card highlight">
                <div className="stat-value">{stats.recentGames.toLocaleString()}</div>
                <div className="stat-label">Recent Games (7 days)</div>
              </div>
            </div>
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="stat-value">{stats.dictionarySize?.toLocaleString() || '—'}</div>
                <div className="stat-label">Words in Dictionary</div>
              </div>
            </div>
          </>
        )}
        <div className="admin-buttons">
          <button className="btn secondary" onClick={onRefresh}>Refresh</button>
          <button className="btn primary" onClick={onBack}>Back to Game</button>
          <button className="btn danger" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </div>
  );
}
