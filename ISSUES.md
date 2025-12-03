# Word Twist - Backend Issues Tracker

This document tracks the backend security and reliability issues identified during code review.

## Original Issues List

### 1. ✅ Score submission trusts client-provided score (CRITICAL)
**Status**: Fixed in PR #3
**Risk**: Leaderboard integrity - anyone could POST arbitrary scores
**Solution**: Implemented server-side game sessions with Redis storage. Score is calculated and tracked server-side. `/api/scores` now requires valid `sessionId` and uses server-calculated score.

### 2. ✅ Validation schemas hard-capped to 6 letters (CRITICAL)
**Status**: Fixed in PR #1
**Risk**: Breaks 7-8 letter puzzles at higher levels
**Solution**: Updated `validateWordSchema` and `solutionsSchema` to accept 6-8 letters.

### 3. ✅ Redis rate limiter chosen at startup, never switches (HIGH)
**Status**: Fixed in PR #3
**Risk**: If Redis unavailable at startup, never uses Redis even when it becomes available
**Solution**: Implemented hybrid store wrapper that checks `redisReady` flag per-request and falls back to MemoryStore dynamically.

### 4. ✅ Puzzle words missing from dictionary (HIGH)
**Status**: Fixed in PR #1
**Risk**: Players can't find the main word for some puzzles
**Solution**: Added ~100 common words to dictionary, removed 39 problematic puzzle words.

### 5. ✅ Anagram duplication in puzzle pools (MEDIUM)
**Status**: Fixed in PR #1
**Risk**: Multiple puzzles with same letters (e.g., LISTEN/SILENT)
**Solution**: Deduped puzzle words by letter signature. Final counts: 64 unique 6-letter, 58 unique 7-letter, 45 unique 8-letter signatures.

### 6. ✅ Hardcoded trust proxy (LOW)
**Status**: Fixed
**Solution**: Added `TRUST_PROXY_HOPS` env var support. Defaults to 2 (Cloudflare → NPM → app).

### 7. ✅ Hardcoded CORS origins (LOW)
**Status**: Fixed
**Solution**: Added `CORS_ORIGINS` env var support (comma-separated). Defaults to twist.tachyonfuture.com + localhost.

### 8. ✅ Weak dev defaults for secrets (LOW)
**Status**: Already addressed
**Verification**: Backend Dockerfile sets `NODE_ENV=production`, and auth.js exits with error if `JWT_SECRET` is missing in production. No weak defaults can leak to prod.

### 9. ✅ Basic auth for admin endpoint (LOW)
**Status**: Kept as-is (acceptable)
**Rationale**: Basic auth over HTTPS is acceptable for internal/admin endpoints. The endpoint is disabled if credentials aren't configured, and it's rate-limited. JWT-based admin auth would add complexity without significant security benefit.

## Completed PRs

### PR #1 - Critical Fixes (Merged)
- Fixed validation schemas for 7-8 letters
- Added ~100 words to dictionary
- Removed 39 problematic puzzle words
- Deduped puzzle words by letter signature
- Added 19 automated tests

### PR #3 - High Priority Fixes (Merged)
- Server-side game sessions with Redis storage (2-hour TTL)
- Atomic word recording via Lua script (prevents race conditions)
- Memory fallback for Redis unavailability
- `/api/validate` uses server-stored letters (not client-provided)
- `/api/scores` requires valid sessionId (no legacy fallback)
- Hybrid rate limiter checks Redis availability per-request

## Remaining Work

All issues have been addressed! The codebase is now fully cleaned up.

## Key Files Reference

- **Session management**: [backend/src/session.js](backend/src/session.js) - Redis-backed sessions with Lua script
- **API endpoints**: [backend/src/index.js](backend/src/index.js) - All routes
- **Validation schemas**: [backend/src/validation.js](backend/src/validation.js) - Zod schemas
- **Project docs**: [CLAUDE_CONTEXT.md](CLAUDE_CONTEXT.md) - Full project context
