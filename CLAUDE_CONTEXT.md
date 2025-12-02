# Word Twist - Project Context

A Text Twist 2 clone deployed at **https://twist.tachyonfuture.com**

## Tech Stack

- **Frontend**: React (Create React App), served via Nginx
- **Backend**: Node.js/Express API
- **Database**: MySQL 8
- **Deployment**: Docker Compose on tachyonfuture.com server
- **SSL**: Nginx Proxy Manager (NPM) handles SSL termination

## Project Structure

```
word-twist/
├── frontend/
│   ├── src/
│   │   ├── App.js          # Main game component (all game logic & screens)
│   │   ├── App.css         # All styling
│   │   ├── sounds.js       # Sound effects module
│   │   └── index.js        # Entry point
│   ├── nginx.conf          # Nginx config for API proxying
│   ├── Dockerfile          # Multi-stage build (node -> nginx)
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── index.js        # Express API endpoints
│   │   ├── game.js         # Puzzle generation & word validation
│   │   ├── db.js           # MySQL connection pool
│   │   └── words.txt       # Scrabble dictionary (29,771 words, 3-6 letters)
│   ├── init.sql            # Database schema
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Orchestrates frontend, backend, mysql
└── CLAUDE_CONTEXT.md       # This file
```

## Key Files

### Frontend - App.js
Single-file React app with all game states:
- `menu` - Main menu with leaderboard sidebar
- `playing` - Active gameplay with letter tiles, word slots, timer
- `roundEnd` - Level complete screen
- `gameOver` - Shows missed words, final score, leaderboard rank
- `login` / `register` - Auth screens
- `leaderboard` - Full leaderboard table view

Key state: `letters`, `foundWords`, `wordsByLength`, `score`, `level`, `timeLeft`, `user`, `leaderboard`

### Backend - index.js
Express API endpoints:
- `GET /api/puzzle` - Generate new 6-letter puzzle
- `POST /api/validate` - Check if word is valid
- `POST /api/solutions` - Get all valid words for letters
- `POST /api/register` / `POST /api/login` - Auth
- `POST /api/scores` - Submit score
- `GET /api/leaderboard` - Top 10 scores
- `GET /api/scores/:userId` - User's scores

### Backend - game.js
- `generatePuzzle()` - Picks random 6-letter word, finds all valid subwords
- `validateWord(word, letters)` - Checks word against dictionary
- `getAllValidWords(letters)` - Returns all valid 3-6 letter words

### Database Schema (init.sql)
```sql
users: id, username, password_hash, created_at
scores: id, user_id, score, level, words_found, game_mode, created_at
```

## Deployment Commands

```bash
# Push and deploy
git push && ssh michael@tachyonfuture.com "cd ~/text-scramble && git pull && docker compose up -d --build"

# Just rebuild
ssh michael@tachyonfuture.com "cd ~/text-scramble && docker compose up -d --build"

# View logs
ssh michael@tachyonfuture.com "cd ~/text-scramble && docker compose logs -f backend"
```

## Game Rules

1. Given 6 scrambled letters (from a valid 6-letter word)
2. Find as many 3-6 letter words as possible
3. Must find at least one 6-letter word to advance to next level
4. Timed mode: 2 minutes per round
5. Untimed mode: No timer
6. Points: word_length * 10 + (word_length - 3) * 5

## Design Details

- **Color scheme**: Dark blue background (#1a1a2e), soft white text (#f5f5f0), blue accents (#4a90d9)
- **Fonts**: Nunito (body), Fredoka One (letter tiles)
- **Letter tiles**: 72x72px with 3D shadow effect
- **Leaderboard**: Shows on menu (sidebar), during game (sidebar), game over screen
- **Found words**: Green slots
- **Missed words**: Red slots (shown on game over)

## Recent Changes (as of Dec 2024)

- Official Scrabble dictionary (no proper nouns/acronyms)
- Leaderboard visible on main menu (side-by-side layout)
- Leaderboard sidebar during gameplay
- Date column on all leaderboard views
- Missed words shown in red on game over
- Enlarged UI elements for better visibility
