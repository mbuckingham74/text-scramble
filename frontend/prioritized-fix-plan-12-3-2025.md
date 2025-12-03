# Frontend Prioritized Fix Plan - December 3, 2025

## Overview

Issues identified during codebase review, prioritized by severity and grouped into logical PRs.

## Progress Tracker

### PR #1: Critical Crash Fix (PR Ready)
- [ ] **Fix `startGame` reference before initialization** (Critical)
  - `useEffect` at lines 288-312 references `startGame` before it's defined at line 364
  - Causes "Cannot access 'startGame' before initialization" on first render
  - **PR:** https://github.com/mbuckingham74/text-scramble/pull/5

### PR #2: Build Reproducibility (PR Ready)
- [ ] **Fix Dockerfile to use package-lock.json and npm ci**
  - Currently runs `npm install` without lock file
  - Container builds can drift with different transitive dependency versions
  - **PR:** https://github.com/mbuckingham74/text-scramble/pull/6

### PR #3: Auth Hardening - Admin (PR Ready)
- [ ] **Replace admin Basic auth with session-based auth**
  - Currently base64-encodes username:password in localStorage
  - Persists credentials indefinitely, exposes to XSS
  - Sends password on every request
  - **PR:** https://github.com/mbuckingham74/text-scramble/pull/7

### PR #4: Auth Hardening - User JWT
- [ ] **Migrate JWT from localStorage to httpOnly cookies**
  - Current localStorage approach vulnerable to XSS/script access
  - No expiry enforcement or refresh logic
  - Backend changes required: set cookie on login, validate from cookie
  - Frontend changes: remove localStorage handling, add `credentials: 'include'`

### PR #5: Code Quality - Extract Constants
- [ ] **Extract gameplay constants to shared config**
  - Timer duration (120s)
  - Scoring formula
  - Level letter counts (6/7/8 letters per level range)
  - Currently inline in App.js, inconsistent with server

### PR #6: Code Quality - Component Extraction
- [ ] **Extract reusable UI components**
  - `WordSlot` component (dedup `renderWordSlots` vs `renderAllWords`)
  - `LeaderboardTable` component (dedup 3 implementations: menu, sidebar, dedicated page)
  - `LetterTile` component

### PR #7: Privacy/Compliance
- [ ] **Add Matomo consent gating and SRI**
  - Currently always injects tracking script
  - No user consent mechanism
  - No Subresource Integrity hash

---

## Severity Legend

| Level | Description |
|-------|-------------|
| Critical | App crash or security vulnerability |
| High | Security concern or major UX issue |
| Medium | Best practice violation |
| Low | Maintainability/code quality |

## Notes

- PRs should be merged in order where dependencies exist
- PR #3 and #4 share auth infrastructure work but are separated for easier review
- PR #5 should coordinate with backend to ensure client/server constants match
