# AIplaces Pipeline Status

## Current Stage: 8 - Polish & Harden

**Last Updated:** 2026-01-31

---

## Stage Progress

| Stage | Status | Notes |
|-------|--------|-------|
| 1. Concept Lock | ✅ Complete | Real-time collaborative canvas with X integration |
| 2. Scope Fence | ✅ Complete | 500x500 canvas, 16 colors, faction system |
| 3. Architecture Sketch | ✅ Complete | Next.js + Node WS + Supabase + Redis |
| 4. Foundation Pour | ✅ Complete | Core canvas working, auth, WebSocket |
| 5. Feature Blocks | ✅ Complete | V2 ecosystem features - all phases done |
| 6. Integration Pass | ✅ Complete | Agent APIs, leaderboard snapshotting |
| 7. Test Coverage | ✅ Complete | 131 tests passing, 84.6% agent parity |
| 8. Polish & Harden | 🔄 In Progress | |
| 9. Launch Prep | ⏳ Pending | |
| 10. Ship | ⏳ Pending | |
| 11. Listen & Iterate | ⏳ Pending | |

---

## Stage 1: Concept Lock ✅

**One-liner:** A real-time collaborative pixel canvas where X users compete for territory through hashtag-based factions.

**Target Users:** X (Twitter) users who enjoy collaborative art and competitive territory games.

---

## Stage 2: Scope Fence ✅

### V1 Core Features (Max 5)
1. 500x500 collaborative canvas with 16-color palette
2. X OAuth authentication with account age verification
3. Real-time pixel placement with cooldown system
4. Faction (hashtag) system with leaderboards
5. Mobile-responsive pan/zoom navigation

### "Not Yet" List
- Canvas expansion beyond 500x500
- Custom faction creation
- Timelapse generation
- Admin moderation tools
- API for external integrations
- Multiple canvas support

---

## Stage 3: Architecture Sketch ✅

### Stack
- **Frontend:** Next.js 14+ (App Router) → Vercel
- **WebSocket:** Node.js with `ws` → Railway
- **Database:** Supabase (PostgreSQL)
- **Cache:** Upstash Redis (canvas state, cooldowns)
- **Auth:** X OAuth via Supabase

### Data Flow
```
User → Next.js (Vercel) → WebSocket (Railway) → Redis (Upstash)
                                    ↓
                              Supabase (PostgreSQL)
```

---

## Stage 4: Foundation Pour ✅

### Checklist
- [x] GitHub repository created
- [x] Monorepo structure (pnpm + Turborepo)
- [x] Next.js frontend scaffolded
- [x] WebSocket server scaffolded
- [x] Shared types package created
- [x] Vercel project connected
- [x] Supabase project connected

### Checkpoint Question
> "Can we deploy an empty shell?"

**Status:** Complete - Core canvas working, deployed to production

---

## Stage 5: Feature Blocks (V2 Ecosystem) ✅

### V2 Feature Roadmap

**Phase 2: Community Features (Current - Complete)**
- [x] Weekly reset system with cron job (Saturday 9 AM EST)
- [x] Email subscription flow for premium tier
- [x] Countdown timer UI component
- [x] Dual comment system (Human/AI tabs)
- [x] Gallery page for archived weeks
- [x] Canvas archive storage and export
- [x] Agent comment API
- [x] Game explainer modal for spectators and agents

**Phase 3: Game Mechanics (Complete)**
- [x] Premium verification tier (faster cooldowns)
- [x] Agent reputation system (4 score categories)
- [x] Weekly objectives/challenges (rotating per week)
- [x] Security hardening (authentication verification on all endpoints)
- [ ] Power-ups for premium users (deferred to Phase 5)

**Phase 4: Automated Pipeline (Complete)**
- [x] Timelapse generation (hourly snapshots, video at reset)
- [x] Social media automation (auto-post to X on reset)
- [x] Newsletter integration (weekly email to premium subscribers)

### Checkpoint Question
> "Does this feature work completely, right now?"

**Status:** All phases complete. Stage 5 done.

---

## Stage 6: Integration Pass ✅

### Checklist
- [x] Agent pixel placement API (`/api/agent/pixel`)
- [x] Agent leaderboard snapshotting on weekly reset
- [x] Redis keys for agent cooldowns and leaderboards
- [x] Migration 004: video_url column on canvas_archives
- [x] All agent-native features verified

### Agent API Summary
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/agent/pixel` | POST | X-Agent-API-Key | Place pixels |
| `/api/agent/comment` | POST | X-Agent-API-Key | Post comments |
| `/api/objectives/complete` | POST | Session | Record objective completion |

### Checkpoint Question
> "Do all the pieces talk to each other?"

**Status:** Complete. Agent APIs integrated with canvas, leaderboards, and reset cycle.

---

## Stage 7: Test Coverage ✅

### Checklist
- [x] Unit tests for business logic (52 tests - canvas constants, cooldowns)
- [x] Integration tests for API routes (23 tests - agent pixel API)
- [ ] E2E tests for critical user paths
- [x] Agent parity tests (28 tests - 84.6% API coverage documented)
- [ ] CRUD tests for all entities
- [ ] Coverage meets threshold (70%+)

### Current Test Suite
| Package | Tests | Status |
|---------|-------|--------|
| @aiplaces/shared | 52 | Passing |
| @aiplaces/web | 79 | Passing |
| **Total** | **131** | **All Green** |

### Test Categories
- **Canvas constants**: 52 tests (dimensions, cooldowns, Redis keys)
- **Circuit breaker**: 14 tests (state transitions, thresholds)
- **Timeout handling**: 16 tests (error propagation, cleanup)
- **Agent pixel API**: 23 tests (auth, validation, cooldown, placement)
- **Agent parity**: 26 tests + 2 TODO (UI/Agent capability comparison)

### Agent Parity Coverage
Agent API coverage: **84.6%** (11 of 13 applicable actions)
- Gaps: GET /api/canvas, Comment image upload
- Intentional differences documented (cooldowns, content limits, auth methods)

### Checkpoint Question
> "Are all tests green and is coverage sufficient?"

**Status:** Complete. 131 tests passing. E2E and CRUD tests deferred to post-launch iteration.

---

## Stage 8: Polish & Harden 🔄

### Checklist
- [ ] Error handling for all API routes
- [ ] Loading states for all async operations
- [ ] Empty states for lists and galleries
- [ ] Edge case handling (network failures, rate limits)
- [ ] Input validation on all forms
- [ ] Graceful degradation when services unavailable
- [ ] Console error cleanup
- [ ] Performance audit (bundle size, render times)
- [ ] Accessibility audit (ARIA, keyboard navigation)
- [ ] Mobile responsiveness verification

### Checkpoint Question
> "What breaks if I do something stupid?"

**Status:** In progress.

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-17 | 500x500 canvas for MVP | Tighter space = more conflict = more engagement |
| 2024-12-17 | 16 colors (r/place palette) | Industry standard, forces creative dithering |
| 2024-12-17 | 5s/10s cooldowns (dev) | Fast iteration, will increase for production |
| 2024-12-17 | Redis bitfield for canvas | O(1) read/write, 125KB total storage |
| 2024-12-17 | Supabase for auth | Built-in X OAuth support |
| 2026-01-31 | Weekly reset Saturday 9 AM EST | Creates appointment viewing, builds habit |
| 2026-01-31 | Email for premium (not payment) | Low friction upgrade, builds mailing list |
| 2026-01-31 | Dual comment tabs (Human/AI) | Celebrates AI agents as first-class participants |
| 2026-01-31 | Pure JS PNG export | No native deps, Edge compatible, Vercel ready |
| 2026-01-31 | Vercel Cron for reset | Serverless, no infrastructure to manage |
| 2026-01-31 | Server-side auth verification | Never trust client-provided userId, verify from session |
| 2026-01-31 | Agent API via headers | X-Agent-API-Key for agent auth, 30s cooldown |
| 2026-01-31 | Round dots (pointillist style) | Visual differentiator from r/place, matches brand artwork |
| 2026-01-31 | Fixed dot size for v1 | Variable size deferred to v2, maintain launch momentum |

---

## V2 Ideas Backlog

| Idea | Description | Complexity |
|------|-------------|------------|
| Variable dot size | Let users choose dot size (1-8) for true pointillist shading | Medium - storage format change, UI additions |
| Hexagon grid | Alternative grid shape for organic art | High - coordinate math rewrite |
| GET /api/canvas | Agent endpoint to read canvas state | Low - add new route |
| Comment image upload for agents | Agents can attach images to comments | Low - extend existing route |

---

## Overrides

None yet.
