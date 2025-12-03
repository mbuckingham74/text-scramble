# Frontend Prioritized Fix Plan - December 3, 2025

## Overview

Issues identified during codebase review, organized by functionality area.

**Naming Convention**: Tasks are numbered T1-T7. GitHub PRs use their own sequence (#5, #6, #8, etc.).

---

## Area 1: Critical Bugs

### T1: startGame Crash Fix ✅ MERGED
- **Issue**: `useEffect` references `startGame` before initialization
- **Scope**: Only `frontend/src/App.js` hook reordering
- **GitHub PR**: #5 (merged)

---

## Area 2: Build/DevOps

### T2: Dockerfile Reproducibility ✅ MERGED
- **Issue**: `npm install` without lock file causes version drift
- **Scope**: Only `frontend/Dockerfile` and `.dockerignore`
- **GitHub PR**: #6 (merged)

---

## Area 3: Authentication Security

### T3: Admin Auth Hardening ✅ MERGED
- **Issue**: Admin credentials stored in localStorage, sent via Basic auth
- **Scope**:
  - `backend/src/index.js` - new login/logout endpoints, cookie middleware
  - `backend/src/session.js` - admin session functions
  - `frontend/src/App.js` - admin login/logout/refresh functions only
- **NOT in scope**: User JWT (that's T4)
- **GitHub PR**: #8

### T4: User JWT Hardening ✅ MERGED
- **Issue**: User JWT stored in localStorage, vulnerable to XSS
- **Scope**:
  - `backend/src/index.js` - set JWT in httpOnly cookie on login/register, add logout endpoint
  - `backend/src/auth.js` - read JWT from cookie (with header fallback for API clients)
  - `frontend/src/App.js` - remove localStorage for token, add `credentials: 'include'`
- **NOT in scope**: Admin auth (that's T3)
- **GitHub PR**: #9 (merged)

---

## Area 4: Privacy/Compliance

### T5: Matomo Consent & SRI ⏭️ SKIPPED
- **Issue**: Tracking script injected without consent, no integrity hash
- **Scope**:
  - `frontend/public/index.html` - conditional loading, SRI hash
  - `frontend/src/App.js` - consent banner component (if needed)
- **NOT in scope**: Any auth or gameplay code
- **Status**: Skipped per user decision

---

## Area 5: Code Quality/Maintainability

### T6: Extract Gameplay Constants ✅ MERGED
- **Issue**: Timer (120s), scoring formula, level thresholds hardcoded in App.js
- **Scope**:
  - `backend/src/constants.js` - source of truth for all gameplay constants
  - `frontend/src/constants.js` - ES module copy (CRA can't import outside src/)
  - `backend/src/game.js`, `backend/src/validation.js`, `backend/src/dictionary.js` - use constants
  - `frontend/src/App.js` - import constants
  - `backend/src/constants.test.js` - sync test to catch drift between frontend/backend
- **NOT in scope**: UI components, auth
- **GitHub PR**: #10 (merged)

### T7: Extract UI Components ✅ MERGED
- **Issue**: `renderWordSlots` vs `renderAllWords` nearly identical; leaderboard rendered 3 times
- **Scope**:
  - `frontend/src/components/WordSlots.js` - unified word display for gameplay and end screens
  - `frontend/src/components/LeaderboardList.js` - compact list for menu/sidebar
  - `frontend/src/components/LeaderboardTable.js` - full table for leaderboard screen
  - `frontend/src/components/LetterTile.js` - interactive letter button
  - `frontend/src/App.js` - use new components, remove duplicated render functions
- **NOT in scope**: Auth, constants, backend
- **GitHub PR**: #11 (merged)

---

## Review Checklist

When reviewing a GitHub PR, only flag issues that are **in scope** for that task. Use this table:

| Task | Auth | Matomo | Constants | UI Components | Dockerfile |
|------|------|--------|-----------|---------------|------------|
| T3 (Admin Auth) | Admin only | ❌ | ❌ | ❌ | ❌ |
| T4 (User JWT) | User only | ❌ | ❌ | ❌ | ❌ |
| T5 (Matomo) | ❌ | ✅ | ❌ | ❌ | ❌ |
| T6 (Constants) | ❌ | ❌ | ✅ | ❌ | ❌ |
| T7 (Components) | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Status Summary

| Area | Task | GitHub PR | Status |
|------|------|-----------|--------|
| Critical Bugs | T1 | #5 | ✅ Merged |
| Build/DevOps | T2 | #6 | ✅ Merged |
| Auth - Admin | T3 | #8 | ✅ Merged |
| Auth - User | T4 | #9 | ✅ Merged |
| Privacy | T5 | - | ⏭️ Skipped |
| Constants | T6 | #10 | ✅ Merged |
| Components | T7 | #11 | ✅ Merged |

**All tasks complete!** (6 merged, 1 skipped)
