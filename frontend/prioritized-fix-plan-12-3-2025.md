# Frontend Prioritized Fix Plan - December 3, 2025

## Overview

Issues identified during codebase review, organized by functionality area.

---

## Area 1: Critical Bugs

### PR #1: startGame Crash Fix ✅ MERGED
- **Issue**: `useEffect` references `startGame` before initialization
- **Scope**: Only `frontend/src/App.js` hook reordering
- **GitHub PR**: #5 (merged)

---

## Area 2: Build/DevOps

### PR #2: Dockerfile Reproducibility ✅ MERGED
- **Issue**: `npm install` without lock file causes version drift
- **Scope**: Only `frontend/Dockerfile` and `.dockerignore`
- **GitHub PR**: #6 (merged)

---

## Area 3: Authentication Security

### PR #3: Admin Auth Hardening 🔄 IN REVIEW
- **Issue**: Admin credentials stored in localStorage, sent via Basic auth
- **Scope**:
  - `backend/src/index.js` - new login/logout endpoints, cookie middleware
  - `backend/src/session.js` - admin session functions
  - `frontend/src/App.js` - admin login/logout/refresh functions only
- **NOT in scope**: User JWT (that's PR #4)
- **GitHub PR**: #8

### PR #4: User JWT Hardening (NOT STARTED)
- **Issue**: User JWT stored in localStorage, vulnerable to XSS
- **Scope**:
  - `backend/src/index.js` - set JWT in httpOnly cookie on login/register
  - `backend/src/auth.js` - read JWT from cookie instead of header
  - `frontend/src/App.js` - remove localStorage for token, add `credentials: 'include'`
- **NOT in scope**: Admin auth (that's PR #3)

---

## Area 4: Privacy/Compliance

### PR #5: Matomo Consent & SRI (NOT STARTED)
- **Issue**: Tracking script injected without consent, no integrity hash
- **Scope**:
  - `frontend/public/index.html` - conditional loading, SRI hash
  - `frontend/src/App.js` - consent banner component (if needed)
- **NOT in scope**: Any auth or gameplay code

---

## Area 5: Code Quality/Maintainability

### PR #6: Extract Gameplay Constants (NOT STARTED)
- **Issue**: Timer (120s), scoring formula, level thresholds hardcoded in App.js
- **Scope**:
  - New `frontend/src/constants.js` or `shared/constants.js`
  - `frontend/src/App.js` - import constants
  - `backend/src/game.js` - import same constants (if shared)
- **NOT in scope**: UI components, auth

### PR #7: Extract UI Components (NOT STARTED)
- **Issue**: `renderWordSlots` vs `renderAllWords` nearly identical; leaderboard rendered 3 times
- **Scope**:
  - New `frontend/src/components/WordSlot.js`
  - New `frontend/src/components/LeaderboardTable.js`
  - New `frontend/src/components/LetterTile.js`
  - `frontend/src/App.js` - use new components
- **NOT in scope**: Auth, constants, backend

---

## Review Checklist

When reviewing a PR, only flag issues that are **in scope** for that PR. Use this table:

| PR | Auth | Matomo | Constants | UI Components | Dockerfile |
|----|------|--------|-----------|---------------|------------|
| #3 (Admin Auth) | Admin only | ❌ | ❌ | ❌ | ❌ |
| #4 (User JWT) | User only | ❌ | ❌ | ❌ | ❌ |
| #5 (Matomo) | ❌ | ✅ | ❌ | ❌ | ❌ |
| #6 (Constants) | ❌ | ❌ | ✅ | ❌ | ❌ |
| #7 (Components) | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Status Summary

| Area | PR | Status |
|------|-----|--------|
| Critical Bugs | #1 | ✅ Merged |
| Build/DevOps | #2 | ✅ Merged |
| Auth - Admin | #3 | 🔄 PR #8 in review |
| Auth - User | #4 | ⏳ Not started |
| Privacy | #5 | ⏳ Not started |
| Constants | #6 | ⏳ Not started |
| Components | #7 | ⏳ Not started |
