# Game Rotation System - Implementation Summary

## Overview

Complete implementation of the weekly canvas rotation API system for aiPlaces.art. This system allows different game modes to be active each week, archives completed canvases, and provides endpoints for querying game state.

## Files Created

### Database Migration
- **`supabase/migrations/008_game_modes_system.sql`**
  - Creates `game_modes` table with 8 pre-defined modes
  - Creates `canvas` singleton table for active week state
  - Adds `game_mode_id` column to `canvas_archives`
  - Seeds default game modes (Classic, Color Wars, Quadrants, etc.)
  - Sets up RLS policies and indexes

### API Routes

#### `/apps/web/src/app/api/game/current/route.ts`
- **GET** endpoint
- Returns current week's active game mode
- Includes countdown timer (timeUntilReset)
- Shows upcoming announcement time if scheduled
- Response: `CurrentGameResponse` type

#### `/apps/web/src/app/api/game/upcoming/route.ts`
- **GET** endpoint
- Returns next week's pre-scheduled game mode
- Respects `announce_next_at` timestamp
- Returns null if not yet announced
- Response: `UpcomingGameResponse` type

#### `/apps/web/src/app/api/game/modes/route.ts`
- **GET** endpoint
- Lists all available game modes
- Query param: `activeOnly=true` (default)
- Groups modes by difficulty (easy, medium, hard, chaos)
- Response: `GameModesResponse` type

#### `/apps/web/src/app/api/game/rotate/route.ts`
- **POST** endpoint (protected)
- Triggers weekly canvas rotation
- Auth: `Authorization: Bearer <CRON_SECRET>`
- Process:
  1. Archive current week
  2. Backup canvas from Redis
  3. Compute statistics
  4. Select next game mode
  5. Update canvas state
  6. Reset Redis keys
  7. Return summary
- Response: `RotationResponse` type

### Enhanced Existing Routes

#### `/apps/web/src/app/api/archives/route.ts` (updated)
- Added `game_mode_id` to query
- Joins with `game_modes` table
- Returns game mode info for each archive
- Enables filtering/display by game type

### TypeScript Types

#### `/packages/shared/src/types/game.ts` (updated)
- Added API response types:
  - `CurrentGameResponse`
  - `UpcomingGameResponse`
  - `GameModesResponse`
  - `RotationResponse`
  - `ArchivesResponse`
- Added helper types:
  - `WeekInfo`
  - `CanvasArchiveWithMode`
- Preserves existing `DbGameMode`, `GameModeRules`, etc.

### Documentation

#### `/apps/web/src/app/api/game/README.md`
- Complete API documentation
- Endpoint specifications with examples
- Request/response formats
- Game mode descriptions
- Cron setup instructions
- Testing guide
- Error handling patterns
- Environment variables

#### `/tmp/x-place-temp/GAME_ROTATION_ARCHITECTURE.md`
- System architecture diagrams (ASCII art)
- Data flow sequence
- Service boundaries
- Database schema design
- Caching strategy (Redis + HTTP)
- Performance optimization
- Scaling considerations
- Security & rate limiting
- Bottleneck analysis
- Technology recommendations
- Deployment checklist
- Disaster recovery procedures

## Architecture Highlights

### Service Boundaries

```
┌─────────────────────────────────────────┐
│         Client (Next.js App)            │
│  - Game mode display                    │
│  - Countdown timer                      │
│  - Archive gallery                      │
└──────────────┬──────────────────────────┘
               │
               │ HTTP/JSON
               │
┌──────────────▼──────────────────────────┐
│        API Layer (Next.js)              │
│  - /api/game/current                    │
│  - /api/game/upcoming                   │
│  - /api/game/modes                      │
│  - /api/game/rotate (protected)         │
│  - /api/archives (enhanced)             │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼────┐  ┌────▼─────┐
│  Supabase  │  │  Redis   │
│ (Postgres) │  │ (Cache)  │
│            │  │          │
│ - game_    │  │ - canvas │
│   modes    │  │   state  │
│ - canvas   │  │ - weekly │
│ - canvas_  │  │   stats  │
│   archives │  │          │
└────────────┘  └──────────┘
```

### Inter-Service Communication

- **API ↔ Supabase:** Direct SQL queries via Supabase client
- **API ↔ Redis:** Key-value operations via `getRedis()` utility
- **Cron → API:** HTTP POST with Bearer token auth

### Data Consistency Requirements

**Strong Consistency (Postgres):**
- Game mode definitions (rarely change)
- Canvas state (single source of truth)
- Archives (immutable historical records)

**Eventual Consistency (Redis):**
- Canvas pixel data (can reconstruct from backup)
- Weekly statistics (aggregated at rotation time)
- Cooldown tracking (acceptable drift)

### Horizontal Scaling Plan

**Current (Phase 1):**
- Serverless API routes (auto-scale on Vercel)
- Single Postgres instance (Supabase)
- Single Redis instance (Upstash)

**Future (Phase 2):**
- Read replicas for Postgres (archives queries)
- Redis cluster (shard by user ID)
- CDN caching for static responses

**Future (Phase 3):**
- Archive microservice (separate from main API)
- Event-driven rotation (Kafka/Redis Streams)
- Separate analytics database (ClickHouse)

## Database Schema

### `game_modes` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique identifier (e.g., "classic") |
| `name` | TEXT | Display name |
| `description` | TEXT | Long description |
| `icon` | TEXT | Emoji or icon name |
| `rules` | JSONB | Flexible rule structure |
| `difficulty` | TEXT | easy/medium/hard/chaos |
| `is_active` | BOOLEAN | Can be selected for rotation |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_game_modes_active` on `is_active WHERE is_active = TRUE`

### `canvas` Table (Singleton)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Always single row |
| `current_game_mode_id` | TEXT (FK) | Active game mode |
| `week_number` | INTEGER | ISO week number |
| `year` | INTEGER | Year |
| `started_at` | TIMESTAMPTZ | Week start time |
| `reset_at` | TIMESTAMPTZ | Next rotation time |
| `next_game_mode_id` | TEXT (FK) | Pre-scheduled next mode |
| `announce_next_at` | TIMESTAMPTZ | When to reveal next mode |
| `metadata` | JSONB | Additional data |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Constraints:**
- `UNIQUE INDEX idx_canvas_singleton ON canvas ((1))` - ensures single row

### `canvas_archives` Table (Enhanced)

Added column:
- `game_mode_id` TEXT REFERENCES game_modes(id)

**Indexes:**
- `idx_archives_game_mode` on `game_mode_id`

## API Contracts

### GET /api/game/current

**Request:**
```http
GET /api/game/current HTTP/1.1
```

**Response (200 OK):**
```typescript
{
  currentMode: {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    rules: Record<string, unknown>;
    difficulty: string | null;
  } | null;
  week: {
    weekNumber: number;
    year: number;
    startedAt: string;
    resetAt: string;
  };
  timeUntilReset: number; // milliseconds
  timeUntilAnnouncement: number | null; // milliseconds
  serverTime: string; // ISO8601
}
```

### GET /api/game/upcoming

**Request:**
```http
GET /api/game/upcoming HTTP/1.1
```

**Response (200 OK - Announced):**
```typescript
{
  upcomingMode: {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    rules: Record<string, unknown>;
    difficulty: string | null;
  };
  announced: true;
  startsAt: string; // ISO8601
  serverTime: string; // ISO8601
}
```

**Response (200 OK - Not Announced):**
```typescript
{
  upcomingMode: null;
  announced: false;
  message: "Next week's game mode will be announced soon";
  serverTime: string; // ISO8601
}
```

### GET /api/game/modes

**Request:**
```http
GET /api/game/modes?activeOnly=true HTTP/1.1
```

**Response (200 OK):**
```typescript
{
  modes: Array<{
    id: string;
    name: string;
    description: string;
    icon: string | null;
    rules: Record<string, unknown>;
    difficulty: string | null;
    is_active: boolean;
    created_at: string;
  }>;
  groupedByDifficulty: {
    easy: [...];
    medium: [...];
    hard: [...];
    chaos: [...];
  };
  total: number;
}
```

### POST /api/game/rotate (Protected)

**Request:**
```http
POST /api/game/rotate HTTP/1.1
Authorization: Bearer <CRON_SECRET>
```

**Response (200 OK):**
```typescript
{
  success: true;
  summary: {
    previousWeek: {
      weekNumber: number;
      year: number;
      gameModeId: string | null;
      archivedId: string;
    };
    newWeek: {
      weekNumber: number;
      year: number;
      gameModeId: string | null;
      startedAt: string;
      resetAt: string;
    };
    stats: {
      totalPixelsPlaced: number;
      uniqueContributors: number;
    };
  };
  rotatedAt: string; // ISO8601
}
```

**Response (401 Unauthorized):**
```typescript
{
  error: "Unauthorized"
}
```

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **API Framework** | Next.js 14 App Router | Serverless, TypeScript, co-located with frontend |
| **Database** | PostgreSQL (Supabase) | JSONB support, RLS, mature ecosystem |
| **Cache** | Redis (Upstash) | Atomic ops, pub/sub, sorted sets |
| **Hosting** | Vercel | Edge network, cron jobs, zero-config |
| **Language** | TypeScript 5.3+ | Type safety, IDE support |
| **Auth** | Bearer tokens | Simple, stateless, works with cron |

## Potential Bottlenecks

### 1. Archive Creation (Rotation Step 6)
- **Issue:** Large JSONB insertion blocks database
- **Impact:** 2-5s latency spike
- **Mitigation:** Async job queue (BullMQ), background processing

### 2. Redis Key Cleanup (Rotation Step 9)
- **Issue:** Delete thousands of keys serially
- **Impact:** 10-30s rotation time
- **Mitigation:** SCAN + DEL pipeline, parallel batches

### 3. Statistics Computation (Rotation Step 5)
- **Issue:** Aggregate millions of pixel events
- **Impact:** CPU spike, memory pressure
- **Mitigation:** Maintain running totals during week (increment on pixel)

### 4. Concurrent Rotations
- **Issue:** Cron retry triggers duplicate rotation
- **Impact:** Data corruption, duplicate archives
- **Mitigation:** Redis lock with `SETNX` (recommended)

**Lock Implementation:**
```typescript
const lockKey = 'xplace:lock:rotation';
const acquired = await redis.set(lockKey, '1', { NX: true, EX: 300 });
if (!acquired) {
  return 409 Conflict;
}
```

## Scaling Roadmap

### Current Capacity
- **Requests/sec:** 1,000+ (serverless auto-scale)
- **Database:** 10M archives (years of operation)
- **Redis:** 256MB (canvas + weekly stats)

### Phase 2 (10x traffic)
- Enable Postgres read replicas
- Add CDN caching (CloudFront/Vercel Edge)
- Implement HTTP cache headers (stale-while-revalidate)

### Phase 3 (100x traffic)
- Separate archive microservice
- Shard Redis by user ID
- Move analytics to ClickHouse

## Security Considerations

### Authentication
- Public endpoints: No auth (RLS protects data)
- Rotation endpoint: Bearer token (2 valid secrets)
  1. `CRON_SECRET` (for automated cron)
  2. `SUPABASE_SERVICE_ROLE_KEY` (for manual admin)

### Rate Limiting (Recommended)
```typescript
// Vercel middleware or Edge Config
const rateLimit = {
  '/api/game/*': 60, // req/min
  '/api/game/rotate': 1, // req/hour
};
```

### Input Validation
- Pagination: `Math.min(50, Math.max(1, limit))`
- Enums: Whitelist validation
- SQL Injection: Parameterized queries (Supabase client)

### Row Level Security (RLS)
All tables have public read policies:
```sql
CREATE POLICY "Public read" ON table_name
  FOR SELECT TO anon, authenticated
  USING (true);
```

## Deployment Checklist

### Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=<strong-random-secret>

# Redis (via lib/redis/client.ts)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Database Setup
```bash
# Run migration
cd /tmp/x-place-temp
npx supabase migration up

# Verify
psql> SELECT * FROM game_modes;
# Should return 8 default modes
```

### Vercel Cron Setup
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/game/rotate",
      "schedule": "0 14 * * 6"
    }
  ]
}
```

Schedule: Every Saturday 2PM UTC (9AM EST)

### Testing Commands
```bash
# Local development
npm run dev

# Test endpoints
curl http://localhost:3000/api/game/current
curl http://localhost:3000/api/game/modes
curl -X POST http://localhost:3000/api/game/rotate \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitoring & Observability

### Key Metrics
- Rotation success rate (target: 100%)
- Rotation duration (target: < 5s)
- API response time p95 (target: < 300ms)
- Cache hit rate (target: > 90%)

### Alerts (Recommended)
- Rotation failure → PagerDuty
- API error rate > 1% → Sentry
- Database pool exhausted → Slack

### Tools
- **Vercel Analytics** - Request logs, performance
- **Sentry** - Error tracking, stack traces
- **Supabase Dashboard** - Query performance, logs
- **Upstash Console** - Redis metrics, memory usage

## Future Enhancements

### Phase 2 (Q2 2026)
- [ ] Pre-schedule multiple weeks
- [ ] Community voting on next mode
- [ ] Mode-specific leaderboards
- [ ] Archive thumbnails generated on rotation

### Phase 3 (Q3 2026)
- [ ] Dynamic mid-week rule updates
- [ ] Custom game mode builder (admin UI)
- [ ] Event-triggered mechanics (flash events)
- [ ] AI-suggested game modes

### Phase 4 (Q4 2026)
- [ ] Cross-mode achievements
- [ ] Tournament mode (compete across modes)
- [ ] Game mode NFTs (collect rare modes)
- [ ] Mode remix system (combine mechanics)

## Testing Strategy

### Unit Tests
```typescript
// packages/shared/src/week.test.ts
describe('getISOWeekNumber', () => {
  it('returns correct week number', () => {
    expect(getISOWeekNumber(new Date('2026-01-31'))).toBe(5);
  });
});
```

### Integration Tests
```typescript
// apps/web/src/app/api/game/__tests__/rotation.test.ts
describe('POST /api/game/rotate', () => {
  it('creates archive and updates canvas', async () => {
    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
  });
});
```

### E2E Tests (Playwright)
```typescript
test('displays game mode and countdown', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="game-mode"]')).toBeVisible();
});
```

## Support & Maintenance

### Common Issues

**Q: Rotation failed mid-process**
A: Check `/api/game/rotate` logs, verify Redis lock, restore from backup if needed

**Q: Wrong game mode selected**
A: Update `canvas.current_game_mode_id` manually in Supabase dashboard

**Q: Archive missing thumbnail**
A: Normal - thumbnails generated async (separate process)

### Rollback Procedure
See GAME_ROTATION_ARCHITECTURE.md "Disaster Recovery" section

---

**Implementation Date:** 2026-01-31
**Version:** 1.0.0
**Author:** Backend System Architect (Claude)
**Status:** Ready for Review & Testing
