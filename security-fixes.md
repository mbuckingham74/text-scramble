# Security Fixes - December 2024

This document describes the security improvements made to the Word Twist backend API.

## Issues Addressed

### 1. Unauthenticated Score Submission
**Problem:** Score submissions trusted a user-supplied `userId` in the request body. Anyone could POST scores for any account.

**Fix:** Added JWT authentication. Score submission now requires a valid `Authorization: Bearer <token>` header. The user ID is extracted from the verified token, not the request body.

### 2. No Session/Token Auth
**Problem:** Login only returned `userId`/`username` with no session or token. The returned `userId` could be reused to submit fake scores.

**Fix:** Login and registration now return a JWT token (expires in 7 days). Protected endpoints require this token.

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
- `word`: 3-6 letter alphabetic string
- `username`: 3-20 alphanumeric characters + underscores
- `password`: 4-100 characters

### 6. Hardcoded Database Credentials
**Problem:** Default credentials hardcoded in `db.js` with no enforcement of environment variables.

**Fix:** In production (`NODE_ENV=production`), the app now requires `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` environment variables. Missing any will cause immediate exit with an error message.

### 7. Verbose Logging in Production
**Problem:** Dictionary size logged on every startup, exposing internals.

**Fix:** Dictionary load message now only appears in non-production environments.

## New Files

- `backend/src/auth.js` - JWT token generation, verification, and auth middleware
- `backend/src/validation.js` - Zod schemas and validation middleware
- `.env` - Environment variables (not committed to git)

## New Dependencies

- `jsonwebtoken` - JWT token handling
- `express-rate-limit` - Rate limiting middleware
- `zod` - Schema validation

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

- `POST /api/scores` - Now requires `Authorization: Bearer <token>` header. No longer accepts `userId` in body.
- `POST /api/login` - Now returns `token` in response
- `POST /api/register` - Now returns `token` in response

### Removed Endpoints

- `GET /api/scores/:userId` - Replaced with `/api/scores/me`

### New Endpoints

- `GET /api/scores/me` - Get current user's scores (requires auth)

## Frontend Changes

- Stores JWT token in `localStorage` as `wordtwist_token`
- Sends `Authorization: Bearer <token>` header with score submissions
- Clears token on logout

## Deployment Notes

1. Create `.env` file on server with `JWT_SECRET` (use `openssl rand -base64 32` to generate)
2. Existing users will need to log in again to get a JWT token
3. Old sessions (just `userId` in localStorage) will not work for score submission
