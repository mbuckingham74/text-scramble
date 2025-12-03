# Security Fixes - December 2024

This document describes the security improvements made to the Word Twist backend API.

## Issues Addressed

### 1. Unauthenticated Score Submission
**Problem:** Score submissions trusted a user-supplied `userId` in the request body. Anyone could POST scores for any account.

**Fix:** Added JWT authentication with httpOnly cookies. Score submission extracts user ID from verified token, not request body.

### 2. No Session/Token Auth
**Problem:** Login only returned `userId`/`username` with no session or token. The returned `userId` could be reused to submit fake scores.

**Fix:** Login and registration set JWT in httpOnly cookie (expires in 7 days). Also returns token in response body for non-browser API clients. Protected endpoints require valid JWT.

### 3. No Rate Limiting
**Problem:** Auth endpoints had no rate limiting, allowing unlimited brute-force attempts.

**Fix:** Added `express-rate-limit`:
- Auth endpoints (`/api/login`, `/api/register`): 10 attempts per 15 minutes
- General API: 100 requests per minute

### 4. Wide-Open CORS
**Problem:** `cors()` with no restrictions allowed any site to make authenticated requests.

**Fix:** CORS now restricted to:
- `https://twist.tachyonfuture.com` (production)
- `http://localhost:3000` and `http://localhost:3001` (development)

### 5. Missing Input Validation
**Problem:** Inputs were only presence-checked. No type/range validation for `score`, `level`, `wordsFound`, `gameMode`, or `letters`.

**Fix:** Added Zod schema validation:
- `score`: integer, 0-1,000,000
- `level`: integer, 1-1,000
- `wordsFound`: integer, 0-500
- `gameMode`: enum `'timed'` | `'untimed'`
- `letters`: array of exactly 6 single-letter strings
- `word`: MIN_WORD_LENGTH to MAX_WORD_LENGTH letter alphabetic string (uses shared constants)
- `username`: 3-20 alphanumeric characters + underscores
- `password`: 4-100 characters

### 6. Hardcoded Database Credentials
**Problem:** Default credentials hardcoded in `db.js` with no enforcement of environment variables.

**Fix:** In production (`NODE_ENV=production`), the app now requires `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` environment variables. Missing any will cause immediate exit with an error message.

### 7. Verbose Logging in Production
**Problem:** Dictionary size logged on every startup, exposing internals.

**Fix:** Dictionary load message now only appears in non-production environments.

## New Files

- `backend/src/auth.js` - JWT token generation, verification, and auth middleware (reads from cookie with header fallback)
- `backend/src/validation.js` - Zod schemas and validation middleware (uses shared constants)
- `backend/src/constants.js` - Shared gameplay constants (timers, scoring, level thresholds)
- `backend/src/constants.test.js` - Tests to verify frontend/backend constants stay in sync
- `backend/src/session.js` - Admin session management with httpOnly cookies
- `frontend/src/constants.js` - Frontend copy of gameplay constants (ES modules)
- `frontend/src/components/` - Reusable UI components (WordSlots, LeaderboardList, LeaderboardTable, LetterTile)
- `.env` - Environment variables (not committed to git)

## New Dependencies

- `jsonwebtoken` - JWT token handling
- `express-rate-limit` - Rate limiting middleware
- `zod` - Schema validation
- `cookie-parser` - Cookie parsing middleware for httpOnly JWT cookies

## Environment Variables

The following environment variables are now used:

| Variable | Required in Prod | Description |
|----------|------------------|-------------|
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `DB_HOST` | Yes | MySQL host |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `NODE_ENV` | Recommended | Set to `production` for prod |

## API Changes

### Modified Endpoints

- `POST /api/scores` - Now requires valid JWT (from httpOnly cookie or Authorization header). No longer accepts `userId` in body.
- `POST /api/login` - Sets JWT in httpOnly cookie, also returns `token` in response body
- `POST /api/register` - Sets JWT in httpOnly cookie, also returns `token` in response body

### Removed Endpoints

- `GET /api/scores/:userId` - Replaced with `/api/scores/me`

### New Endpoints

- `GET /api/scores/me` - Get current user's scores (requires auth)
- `POST /api/logout` - Clears user JWT cookie
- `POST /api/admin/login` - Admin login with httpOnly session cookie
- `POST /api/admin/logout` - Clears admin session cookie
- `GET /api/admin/stats` - Admin dashboard stats (requires admin session)

## Frontend Changes

- JWT now stored in httpOnly cookie (not localStorage) - XSS protection
- All API calls use `credentials: 'include'` for cookie handling
- User info (username only) stored in localStorage for display
- Admin auth uses separate httpOnly session cookies
- Extracted reusable UI components (WordSlots, LeaderboardList, LeaderboardTable, LetterTile)
- Gameplay constants imported from `constants.js` instead of hardcoded
- Safe localStorage parsing with try/catch to handle malformed data
- Proper API error handling with `response.ok` checks
- Fixed stale closure in `endRound` using refs for current game state
- Fixed duplicate word detection casing (always uppercase)
- Removed unused `/solutions` API call
- Fixed `showMessage` timeout cleanup on unmount
- Added proper dependency array to keyboard listener effect
- Dockerfile now uses `package-lock.json` with `npm ci --legacy-peer-deps` for reproducible builds

## Deployment Notes

1. Create `.env` file on server with `JWT_SECRET` and `ADMIN_SESSION_SECRET` (use `openssl rand -base64 32` to generate each)
2. Existing users will need to log in again to get a JWT cookie
3. Old sessions (just `userId` in localStorage) will not work for score submission
4. Admin credentials should be set via `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables
5. Run `npm test` in backend to verify constants are in sync between frontend/backend
6. Redis is used for rate limiting with graceful fallback to memory if unavailable
7. Rate limiter lazily initializes Redis connection to prevent startup crashes
