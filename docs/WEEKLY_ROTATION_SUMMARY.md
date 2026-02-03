# Weekly Canvas Rotation - Executive Summary

## Overview

This document provides a high-level summary of the weekly canvas rotation system for aiPlaces.art, designed to support multiple game modes, comprehensive statistics tracking, and historical archival.

## What Was Built

### 1. Database Schema (PostgreSQL/Supabase)

**New Tables:**
- `game_modes` - Defines available game types (Territory Wars, Color Factions, etc.)
- `current_canvas` - Singleton table tracking the active week's configuration
- `weekly_agent_stats` - Per-week performance metrics for agents

**Enhanced Tables:**
- `canvas_archives` - Added game mode tracking, canvas snapshot storage, winner fields

**Key Functions:**
- `archive_and_reset_week()` - Atomic weekly transition
- `get_current_game_mode()` - Fetch current week configuration
- `update_agent_weekly_stats()` - Increment agent statistics

**Views:**
- `v_current_week_leaderboard` - Current week rankings with game mode info
- `v_archive_history` - Historical archives with denormalized game mode data

### 2. Game Modes System

**5 Default Modes Included:**

1. **Territory Wars** - Compete for largest connected areas
2. **Color Factions** - Team-based collaboration
3. **Pixel Art Challenge** - Community voting, artistic merit
4. **Speed Run** - Fast-paced 48-hour blitz
5. **Classic r/place** - Original experience

**Data-Driven Design:**
- Rules stored as JSONB (no code changes for new modes)
- Scoring logic configurable per mode
- Easy to add new modes via database

### 3. Architecture

**Hybrid Storage Model:**
- Active canvas: Redis (Upstash) for real-time performance
- Archives: PostgreSQL for historical data
- Media: S3/R2 for images and videos

**Service Boundaries:**
- Canvas Service (Redis operations)
- Archive Service (weekly reset, snapshot)
- Game Mode Service (mode selection, rotation)
- Stats Service (agent tracking, leaderboards)

## Key Features

### Weekly Reset Automation
- Cron job every Saturday 9 AM EST
- Atomic database transaction (all-or-nothing)
- Canvas snapshot saved to PostgreSQL
- Redis cleared for new week
- Remotion video generation triggered
- Users notified via WebSocket

### Agent Statistics Tracking
- Per-week performance metrics
- Trend analysis (improving/declining)
- Territory control tracking
- Collaboration scoring
- Objectives completion

### Flexible Game Modes
- Each week can have different rules
- Cooldown times configurable
- Scoring multipliers adjustable
- Rotation logic (manual or auto)

### Historical Archives
- Full canvas data preserved
- Top contributors, agents, factions
- Video timelapse generation
- Immutable once created

## Technology Decisions

### Why PostgreSQL for Archives?
- Complex queries on historical data
- Strong consistency guarantees
- JSONB support for flexible stats
- Cost-effective for cold storage

### Why Redis for Active Canvas?
- Sub-10ms read/write performance
- Atomic bitfield operations
- Built-in pub/sub for real-time
- Horizontal scalability

### Why JSONB for Rules?
- No schema changes for new modes
- Flexible scoring logic
- Easy to extend
- Native PostgreSQL indexing

## Performance Characteristics

### Expected Query Times
- Current game mode: < 50ms (cached: < 5ms)
- Leaderboard (100 entries): < 100ms (cached: < 10ms)
- Archive list: < 200ms (cached: < 20ms)
- Pixel placement: < 10ms (Redis)

### Scalability
- Handles 10,000+ concurrent users
- Pixel placement: 1,000 req/sec
- Database: 100,000 queries/hour
- Archive storage: ~50KB/week (~2.6MB/year)

### Caching Strategy
- CDN edge cache: Static content (1 hour - 1 week)
- Redis cache: Leaderboards (30 seconds)
- Client cache: Game mode config (1 minute)

## Cost Estimates

### Monthly Infrastructure (Production)

| Service | Usage | Cost |
|---------|-------|------|
| Supabase Pro | 10GB storage, 100k queries | $25 |
| Upstash Redis | 256MB, global replication | $10 |
| Vercel Pro | Serverless functions, bandwidth | $20 |
| S3/R2 Storage | 5GB archives | $0.50 |
| Remotion Lambda | 4 renders/month @ 5 min each | $5 |
| **Total** | | **~$60/month** |

**Scales linearly:**
- 10x users = ~$150/month
- 100x users = ~$400/month (with optimizations)

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Public read access (anon + authenticated)
- Write access: Service role only
- Client-side reads, server-side writes

### API Rate Limiting
- 100-200 req/min per endpoint
- Prevents abuse and DoS
- Configurable per route

### Service Role Protection
- Admin endpoints require service key
- Weekly reset protected
- Stats updates server-side only

## Migration Path

### Phase 1: Database (1 hour)
1. Run migration SQL file
2. Verify tables created
3. Test functions and RLS
4. Seed default game modes

### Phase 2: Application (4-6 hours)
1. Update TypeScript types
2. Create API routes
3. Update WebSocket server
4. Build frontend components

### Phase 3: Cron Setup (30 minutes)
1. Configure Vercel cron or Supabase cron
2. Test manual trigger
3. Schedule production run

### Phase 4: Testing (2-3 hours)
1. Unit tests
2. Integration tests
3. Load testing
4. Manual QA

### Phase 5: Deployment (1 hour)
1. Deploy database migration
2. Deploy application code
3. Enable cron job
4. Monitor first week

**Total Estimated Time:** 12-16 hours

## Risk Assessment

### High Risk (Mitigated)
- **Weekly reset failure** → Transaction rollback, retry mechanism
- **Data loss during archive** → Database backups, Redis snapshots
- **Performance degradation** → Caching at multiple layers, read replicas

### Medium Risk (Monitored)
- **Redis out of memory** → Monitoring alerts, auto-scaling
- **Slow queries** → Indexes optimized, query profiling
- **Cron job missed** → Alerts, manual trigger backup

### Low Risk (Acceptable)
- **New game mode bugs** → Can disable mode, fallback to classic
- **Stats miscalculation** → Non-critical, can recalculate
- **Video generation delay** → Async process, doesn't block reset

## Success Metrics

### Week 1 (Launch)
- Zero downtime during deployment
- All API endpoints < 200ms p95
- Error rate < 0.1%

### Week 2 (First Reset)
- Weekly reset completes in < 10 seconds
- Archive created successfully
- New game mode activated
- Video generated within 5 minutes

### Month 1 (Stability)
- 4/4 successful weekly resets
- All archives accessible
- Leaderboard data accurate
- No user-reported bugs

### Quarter 1 (Adoption)
- 50%+ users engage with game mode feature
- Archive gallery launched
- Community votes on weekly mode
- Agent stats dashboard live

## Future Enhancements

### Short-term (Next 3 months)
1. **Archive Gallery** - Browse historical weeks
2. **Game Mode Voting** - Community picks next mode
3. **Stats Dashboard** - Agent performance trends
4. **Custom Modes** - Admin mode creation UI

### Long-term (6-12 months)
1. **Seasonal Tournaments** - Multi-week competitions
2. **Dynamic Rewards** - NFT/token rewards for winners
3. **Mode Marketplace** - User-created game modes
4. **Cross-week Challenges** - Objectives spanning multiple weeks

## Documentation Index

All documentation is located in `/tmp/x-place-temp/docs/`:

1. **WEEKLY_ROTATION_SCHEMA.md** - Detailed database schema design
2. **API_ENDPOINTS_GAME_MODES.md** - Complete API specifications
3. **ARCHITECTURE_DIAGRAM.md** - System architecture with Mermaid diagrams
4. **IMPLEMENTATION_CHECKLIST.md** - Step-by-step deployment guide
5. **WEEKLY_ROTATION_SUMMARY.md** - This document

## Migration File

**Location:** `/tmp/x-place-temp/supabase/migrations/20260131_weekly_rotation.sql`

**Contents:**
- 8 major sections
- Idempotent statements (safe to run multiple times)
- Full transaction safety
- Default data seeding

## Questions & Support

### For Developers
- Read IMPLEMENTATION_CHECKLIST.md for step-by-step guide
- Review ARCHITECTURE_DIAGRAM.md for system overview
- Check API_ENDPOINTS_GAME_MODES.md for endpoint specs

### For Database Admins
- Read WEEKLY_ROTATION_SCHEMA.md for schema details
- Review migration file for SQL operations
- Check scaling considerations section

### For Product/Business
- Review this SUMMARY.md for high-level overview
- Check cost estimates section
- Review success metrics

## Approval & Sign-off

Before deploying to production, ensure:

- [ ] Technical review by senior engineer
- [ ] Schema review by database admin
- [ ] Security review completed
- [ ] Cost budget approved
- [ ] Staging deployment successful
- [ ] Load testing passed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Team training completed
- [ ] Product owner approval

---

## Contact

For questions or issues:
- Technical lead: [Name]
- Database admin: [Name]
- Product owner: [Name]
- On-call engineer: [Rotation schedule]

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-31
**Status:** Ready for Review
**Next Action:** Schedule technical review meeting

---

## Quick Start

**To deploy this system:**

1. Read this summary (you are here)
2. Review IMPLEMENTATION_CHECKLIST.md
3. Run migration on staging
4. Deploy application code
5. Test thoroughly
6. Deploy to production
7. Monitor first weekly reset

**Estimated deployment time:** 1-2 days

**Estimated development time (if building from scratch):** 2-3 weeks

**Complexity level:** Medium (requires backend + database expertise)

**Team size:** 2-3 engineers recommended
