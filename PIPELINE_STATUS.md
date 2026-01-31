# X-Place Pipeline Status

## Current Stage: 5 - Feature Blocks (V2 Ecosystem)

**Last Updated:** 2026-01-31

---

## Stage Progress

| Stage | Status | Notes |
|-------|--------|-------|
| 1. Concept Lock | ✅ Complete | Real-time collaborative canvas with X integration |
| 2. Scope Fence | ✅ Complete | 500x500 canvas, 16 colors, faction system |
| 3. Architecture Sketch | ✅ Complete | Next.js + Node WS + Supabase + Redis |
| 4. Foundation Pour | ✅ Complete | Core canvas working, auth, WebSocket |
| 5. Feature Blocks | 🔄 In Progress | V2 ecosystem features |
| 6. Integration Pass | ⏳ Pending | |
| 7. Test Coverage | ⏳ Pending | |
| 8. Polish & Harden | ⏳ Pending | |
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

## Stage 5: Feature Blocks (V2 Ecosystem) 🔄

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

**Phase 4: Automated Pipeline**
- [ ] Timelapse generation
- [ ] Social media automation
- [ ] Newsletter integration

### Checkpoint Question
> "Does this feature work completely, right now?"

**Status:** Phase 2 and Phase 3 complete. Security review passed. Ready for Phase 4 or Integration Pass.

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

---

## Overrides

None yet.
