# Word Twist - Project Context

A Text Twist 2 clone deployed at **https://twist.tachyonfuture.com**

## Tech Stack

- **Frontend**: React (Create React App), served via Nginx
- **Backend**: Node.js/Express API with JWT authentication
- **Database**: MySQL 8
- **Cache/Rate Limiting**: Redis (shared with Authelia, using database 1)
- **Deployment**: Docker Compose on tachyonfuture.com server
- **SSL**: Nginx Proxy Manager (NPM) handles SSL termination
- **Analytics**: Matomo (site ID 10 on matomo.tachyonfuture.com)

## Project Structure

```
word-twist/
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML template with Matomo tracking
│   ├── src/
│   │   ├── App.js          # Main game component (all game logic & screens)
│   │   ├── App.css         # All styling
│   │   ├── index.css       # Base styles (pure black background)
│   │   ├── sounds.js       # Sound effects module
│   │   └── index.js        # Entry point
│   ├── nginx.conf          # Nginx config for API proxying
│   ├── Dockerfile          # Multi-stage build (node -> nginx)
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── index.js        # Express API endpoints
│   │   ├── auth.js         # JWT token generation & middleware
│   │   ├── validation.js   # Zod schemas for input validation
│   │   ├── game.js         # Puzzle generation & word validation
│   │   ├── dictionary.js   # Word dictionary loader
│   │   ├── db.js           # MySQL connection pool (env var required in prod)
│   │   └── words.txt       # Dictionary (~53K words, 3-8 letters)
│   ├── init.sql            # Database schema
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Orchestrates frontend, backend, mysql
├── .env                    # Environment variables (JWT_SECRET) - not in git
├── security-fixes.md       # Documentation of security improvements
└── CLAUDE_CONTEXT.md       # This file
```

## Key Files

### Frontend - App.js
Single-file React app with all game states:
- `menu` - Main menu with dual leaderboards (Timed & Untimed)
- `playing` - Active gameplay with letter tiles, word slots, timer
- `roundEnd` - Level complete screen
- `gameOver` - Shows missed words, final score, leaderboard rank
- `login` / `register` - Auth screens
- `leaderboard` - Full leaderboard table view (both modes)

Key state: `letters`, `foundWords`, `wordsByLength`, `score`, `level`, `timeLeft`, `user`, `token`, `leaderboard` (has `.timed` and `.untimed` arrays), `leaderboardModal` (shown when player makes top 10)

Uses refs (`gameStateRef`, `messageTimeoutRef`) to avoid stale closures in callbacks.

### Backend - index.js
Express API endpoints:
- `GET /api/puzzle?level=N` - Generate puzzle (6 letters levels 1-5, 7 letters 6-10, 8 letters 11+)
- `POST /api/validate` - Check if word is valid (Zod validated)
- `POST /api/solutions` - Get all valid words for letters
- `POST /api/register` / `POST /api/login` - Auth (returns JWT token)
- `POST /api/scores` - Submit score (requires JWT auth)
- `GET /api/leaderboard` - Top 10 scores for each mode (`{ timed: [], untimed: [] }`)
- `GET /api/scores/me` - Current user's scores (requires auth)
- `GET /api/health` - Health check

### Backend - auth.js
- `generateToken(userId, username)` - Creates JWT (7 day expiry)
- `verifyToken(token)` - Validates JWT
- `authMiddleware` - Express middleware for protected routes

### Backend - validation.js
Zod schemas for all inputs:
- `registerSchema` / `loginSchema` - username (3-20 chars), password (4-100 chars)
- `validateWordSchema` - word (3-8 letters), letters (array of 6-8)
- `solutionsSchema` - letters array
- `scoreSchema` - score (0-1M), level (1-1000), wordsFound (0-500), gameMode enum

### Database Schema (init.sql)
```sql
users: id, username, password_hash, created_at
scores: id, user_id, score, level, words_found, game_mode ENUM('timed','untimed'), created_at
```

## Environment Variables

| Variable | Required in Prod | Description |
|----------|------------------|-------------|
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `DB_HOST` | Yes | MySQL host |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `NODE_ENV` | Recommended | Set to `production` for prod |
| `REDIS_URL` | Optional | Redis URL for rate limiting (falls back to in-memory) |
| `ADMIN_USERNAME` | Optional | Admin dashboard username |
| `ADMIN_PASSWORD` | Optional | Admin dashboard password |

Generate JWT secret: `openssl rand -base64 32`

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

1. Given scrambled letters (6-8 depending on level)
2. Find as many valid words (3+ letters) as possible
3. Must find at least one full-length word to advance to next level
4. Timed mode: 2 minutes per round
5. Untimed mode: No timer
6. Points: word_length * 10 + (word_length - 3) * 5

### Progressive Difficulty
- **Levels 1-5**: 6-letter puzzles (find 3-6 letter words)
- **Levels 6-10**: 7-letter puzzles (find 3-7 letter words)
- **Levels 11+**: 8-letter puzzles (find 3-8 letter words)

## Design Details

- **Background**: Pure black (#000000)
- **Container boxes**: Dark blue (#1a1a2e)
- **Word slots**: Slightly lighter blue (#16213e)
- **Text**: Soft white (#f5f5f0)
- **Accents**: Blue (#4a90d9)
- **Success messages**: Green (#2ed573)
- **Error messages**: Red (#ff4757)
- **Fonts**: Nunito (body), Fredoka One (letter tiles, headings)
- **Letter tiles**: 72x72px with 3D shadow effect
- **Sound toggle**: Fixed position, upper right corner

## UI Features

- **Leaderboards**: Separate for Timed and Untimed modes
  - Menu screen: Both boards side-by-side
  - Game screen: Sidebar shows current mode's board
  - Leaderboard screen: Full tables for both modes
- **Message overlay**: Centered pop-in animation for points/errors (doesn't shift layout)
- **Found words**: Green slots
- **Missed words**: Red slots (shown on game over)
- **All Words section**: Shows all possible words at game over (max-height: 400px, scrollable)
- **Leaderboard achievement modal**: Celebratory popup when player makes the top 10
  - Bouncing trophy icon, animated pop-in effect
  - Shows rank, score, and game mode
  - Dismissible by clicking button or overlay background

## Security Features (Dec 2024)

- JWT authentication for score submission
- Per-route rate limiting (Redis-backed with MemoryStore fallback):
  - Auth endpoints: 10 attempts per 15 min
  - Game endpoints (puzzle/validate/solutions): 300 per min
  - Score submission: 20 per min
  - General (leaderboard, etc): 200 per min
- CORS restricted to twist.tachyonfuture.com and localhost
- Zod input validation on all endpoints
- Environment variables required in production (no hardcoded credentials)
- Password hashing with bcrypt (10 rounds)
- Backend Dockerfile sets NODE_ENV=production to enforce security checks
- Express `trust proxy` set to `2` for the proxy chain (Cloudflare → NPM → app)

## Recent Changes (Dec 2024)

1. **Security overhaul**: JWT auth, rate limiting, input validation, CORS lockdown
2. **Separate leaderboards**: Timed and Untimed modes have independent top 10s
3. **UI improvements**:
   - Pure black background with solid blue container boxes
   - Sound toggle moved to fixed position (upper right)
   - Message overlay (centered pop-in) instead of pushing content
   - All Words section height increased to 400px
4. **Analytics**: Matomo tracking added (site ID 10)
5. **Bug fixes**:
   - Stale closure fix using refs for game state
   - Safe localStorage parsing with try/catch
   - Proper API error handling
   - Duplicate word detection (always uppercase)
   - Timeout cleanup on unmount
6. **Frontend robustness improvements** (Dec 2024):
   - **localStorage safety**: Added `isStorageAvailable()` check for Safari private mode / strict privacy settings. Safe helpers (`safeGetJSON`, `safeGetString`, `safeSetItem`, `safeRemoveItem`) prevent crashes when storage is blocked
   - **API response handling**: `apiFetch` now handles 204 No Content and empty responses correctly, checks Content-Type before parsing JSON
   - **401/expired token handling**: Added `handleAuthError()` that logs user out and shows error when JWT expires or is invalid
   - **User-visible API errors**: Added `apiError` state and dismissible red banner at top of screen. Errors from leaderboard fetch, score submit, and puzzle load are now shown to users instead of silently logged
7. **Backend robustness improvements** (Dec 2024):
   - **Bug fix**: `/api/solutions` was passing array to `getAllValidWords()` which expects a string - now joins array first
   - **Security**: Backend Dockerfile now sets `NODE_ENV=production` so JWT_SECRET and DB credential checks are enforced
   - **Rate limiting**: Replaced single global limiter with per-route limiters (auth, game, score, general)
   - **Dockerfile optimization**: Changed `npm install` to `npm ci` for reproducible builds
   - **Performance**: Precompute valid words for all puzzle words at startup and cache by letter signature. Eliminates 30K dictionary scans on every `/api/puzzle` and `/api/solutions` request
8. **Leaderboard achievement modal** (Dec 2024):
   - When a player's score makes the top 10, a celebratory modal appears
   - Features bouncing trophy icon, animated pop-in, rank display
   - Shows score with locale formatting and game mode
   - Detection happens in `endRound()` after score submission and leaderboard refresh
9. **Redis rate limiting** (Dec 2024):
   - Rate limiting now uses Redis (reuses existing Authelia Redis on database 1)
   - Keys prefixed with `wordtwist:<limiter>:` to avoid conflicts
   - Graceful fallback to MemoryStore if Redis unavailable
   - Connection state tracked via `redisReady` flag with event handlers
   - Backend connects via external `authelia_authelia-backend` Docker network
   - Increased rate limits for better gameplay (game: 300/min, score: 20/min)
   - Fixed `trust proxy` to `2` (number of proxies) for express-rate-limit v7 compatibility
10. **Progressive difficulty** (Dec 2024):
    - Expanded dictionary from ~30K words (3-6 letters) to ~53K words (3-8 letters)
    - Sourced from `/usr/share/dict/words`, filtering out proper nouns
    - Puzzle word lists organized by length: `puzzleWords6`, `puzzleWords7`, `puzzleWords8`
    - Levels 1-5 use 6-letter puzzles, 6-10 use 7-letter, 11+ use 8-letter
    - API accepts `?level=N` query parameter to generate appropriate puzzle
    - Frontend passes current level when fetching new puzzles
