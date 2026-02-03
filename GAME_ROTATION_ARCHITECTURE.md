# Game Rotation System - Architecture & Scaling

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   /game/current       /game/upcoming      /game/modes      /archives        │
│        │                    │                  │                │            │
│        └────────────────────┴──────────────────┴────────────────┘            │
│                                  │                                           │
│                         API Route Handlers                                   │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                          Data Layer                                          │
├──────────────────────────────────┼───────────────────────────────────────────┤
│                                  │                                           │
│   ┌──────────────────┐    ┌─────▼──────┐    ┌──────────────────┐           │
│   │   Supabase       │◄───┤  Service   ├───►│     Redis        │           │
│   │   (PostgreSQL)   │    │   Layer    │    │   (State/Cache)  │           │
│   └──────────────────┘    └─────┬──────┘    └──────────────────┘           │
│                                  │                                           │
│   Tables:                        │             Keys:                         │
│   - game_modes                   │             - canvas:state                │
│   - canvas (singleton)           │             - weekly:pixels:*             │
│   - canvas_archives              │             - weekly:contributors         │
│   - weekly_objectives            │             - week:config                 │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                      External Triggers                                       │
├──────────────────────────────────┼───────────────────────────────────────────┤
│                                  │                                           │
│   ┌──────────────────┐    ┌─────▼──────┐    ┌──────────────────┐           │
│   │  Vercel Cron     │───►│  /api/game │    │  Manual Trigger  │           │
│   │  (Sat 9AM EST)   │    │   /rotate  │◄───│  (Emergency)     │           │
│   └──────────────────┘    └────────────┘    └──────────────────┘           │
│                                                                               │
│   Auth: CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY                            │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow - Weekly Rotation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Rotation Sequence                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Cron Trigger
     │
     │  POST /api/game/rotate
     │  Authorization: Bearer <CRON_SECRET>
     │
     ▼
  2. Verify Auth
     │
     │  Check CRON_SECRET or SERVICE_ROLE_KEY
     │
     ▼
  3. Fetch Current State
     │
     │  SELECT * FROM canvas LIMIT 1;
     │  ├─ current_game_mode_id: "classic"
     │  ├─ week_number: 5
     │  ├─ year: 2026
     │  └─ next_game_mode_id: "chaos_mode" (or null)
     │
     ▼
  4. Backup Canvas
     │
     │  canvasBackup = redis.get("xplace:canvas:state")
     │  └─ Base64 encoded 500x500 4-bit canvas (~125KB)
     │
     ▼
  5. Compute Stats
     │
     │  totalPixels = SUM(redis.ZCARD("xplace:weekly:pixels:user:*"))
     │  contributors = redis.SCARD("xplace:weekly:contributors")
     │
     ▼
  6. Create Archive
     │
     │  INSERT INTO canvas_archives
     │  ├─ week_number: 5
     │  ├─ year: 2026
     │  ├─ started_at: "2026-01-25T14:00:00Z"
     │  ├─ ended_at: NOW()
     │  ├─ game_mode_id: "classic"
     │  ├─ total_pixels_placed: 125000
     │  ├─ unique_contributors: 350
     │  └─ metadata: { canvas_backup: "stored" }
     │
     ▼
  7. Select Next Mode
     │
     │  IF next_game_mode_id IS NOT NULL:
     │    use pre-scheduled mode
     │  ELSE:
     │    SELECT random FROM game_modes WHERE is_active = true
     │  FALLBACK: "classic"
     │
     ▼
  8. Update Canvas
     │
     │  UPDATE canvas SET
     │  ├─ current_game_mode_id = "chaos_mode"
     │  ├─ week_number = 6
     │  ├─ year = 2026
     │  ├─ started_at = NOW()
     │  ├─ reset_at = next_saturday_9am_est()
     │  ├─ next_game_mode_id = NULL
     │  └─ announce_next_at = NULL
     │
     ▼
  9. Reset Redis
     │
     │  redis.del("xplace:canvas:state")
     │  redis.del("xplace:weekly:pixels:user:*")  (batch)
     │  redis.del("xplace:weekly:pixels:agent:*") (batch)
     │  redis.del("xplace:weekly:contributors")
     │
     ▼
  10. Return Summary
     │
     │  200 OK
     │  {
     │    success: true,
     │    summary: {
     │      previousWeek: { ... },
     │      newWeek: { ... },
     │      stats: { ... }
     │    }
     │  }
     │
     ▼
  Done ✓
```

## API Endpoint Design

### Contract-First Approach

All endpoints return consistent JSON structures with typed responses.

**Success Response Pattern:**
```typescript
{
  // Primary data
  [resource]: T | T[] | null,

  // Metadata
  ...additionalContext,
  serverTime: ISO8601
}
```

**Error Response Pattern:**
```typescript
{
  error: string,
  // Optional: details, code, etc.
}
```

### Endpoint Definitions

| Endpoint | Method | Auth | Purpose | Cacheable |
|----------|--------|------|---------|-----------|
| `/api/game/current` | GET | Public | Current game mode + countdown | Yes (60s TTL) |
| `/api/game/upcoming` | GET | Public | Pre-announced next mode | Yes (5min TTL) |
| `/api/game/modes` | GET | Public | List all game modes | Yes (1hr TTL) |
| `/api/game/rotate` | POST | Protected | Trigger weekly rotation | No |
| `/api/archives` | GET | Public | Historical weeks (enhanced) | Yes (1hr TTL) |

### Example Request/Response

**GET /api/game/current**

Request:
```http
GET /api/game/current HTTP/1.1
Host: aiplaces.art
```

Response:
```json
{
  "currentMode": {
    "id": "classic",
    "name": "Classic Mode",
    "description": "Standard X-Place with no restrictions. Place pixels anywhere, anytime (within cooldown).",
    "icon": "🎨",
    "rules": {
      "type": "classic",
      "restrictions": []
    },
    "difficulty": "easy"
  },
  "week": {
    "weekNumber": 5,
    "year": 2026,
    "startedAt": "2026-01-25T14:00:00.000Z",
    "resetAt": "2026-02-01T14:00:00.000Z"
  },
  "timeUntilReset": 432000000,
  "timeUntilAnnouncement": null,
  "serverTime": "2026-01-31T18:30:45.123Z"
}
```

---

**POST /api/game/rotate**

Request:
```http
POST /api/game/rotate HTTP/1.1
Host: aiplaces.art
Authorization: Bearer <CRON_SECRET>
```

Response:
```json
{
  "success": true,
  "summary": {
    "previousWeek": {
      "weekNumber": 5,
      "year": 2026,
      "gameModeId": "classic",
      "archivedId": "a1b2c3d4-..."
    },
    "newWeek": {
      "weekNumber": 6,
      "year": 2026,
      "gameModeId": "chaos_mode",
      "startedAt": "2026-02-01T14:00:00.000Z",
      "resetAt": "2026-02-08T14:00:00.000Z"
    },
    "stats": {
      "totalPixelsPlaced": 125000,
      "uniqueContributors": 350
    }
  },
  "rotatedAt": "2026-02-01T14:00:00.123Z"
}
```

## Database Schema Design

### Normalization

**3NF (Third Normal Form) Compliance:**

1. **game_modes** - Atomic game definitions
   - No repeating groups
   - All non-key attributes depend on primary key
   - `rules` JSONB allows flexible schema evolution

2. **canvas** - Singleton active state
   - Single source of truth for current week
   - Foreign key to `game_modes.id`
   - Unique constraint ensures only one row

3. **canvas_archives** - Historical snapshots
   - Immutable records
   - Denormalizes `game_mode_id` for fast queries
   - No cascading deletes (preserve history)

### Indexes

```sql
-- Fast lookups for active modes
CREATE INDEX idx_game_modes_active
  ON game_modes(is_active)
  WHERE is_active = TRUE;

-- Archive queries by week
CREATE INDEX idx_archives_week
  ON canvas_archives(year DESC, week_number DESC);

-- Archive queries by game mode
CREATE INDEX idx_archives_game_mode
  ON canvas_archives(game_mode_id);

-- Canvas singleton guarantee
CREATE UNIQUE INDEX idx_canvas_singleton
  ON canvas ((1));
```

### Sharding Considerations

**Current: Single PostgreSQL instance**
- Suitable for < 10M archives
- Canvas table has 1 row (no sharding needed)
- Archives grow linearly (52 weeks/year)

**Future (if needed):**
- Shard archives by year (partition key)
- Read replicas for historical queries
- Separate OLAP warehouse for analytics

### Key Relationships

```
game_modes (1) ──────┐
                      │
                      │ (many)
                      ▼
            canvas_archives
                      ▲
                      │ (current)
                      │
                   canvas
                   (1 row)
```

## Caching Strategy

### Redis Layer

| Key Pattern | Type | TTL | Purpose |
|-------------|------|-----|---------|
| `xplace:canvas:state` | String | None | Current canvas pixels (125KB) |
| `xplace:weekly:pixels:user:{id}` | Sorted Set | Week end | Per-user pixel count |
| `xplace:weekly:pixels:agent:{id}` | Sorted Set | Week end | Per-agent pixel count |
| `xplace:weekly:contributors` | Set | Week end | Unique user IDs this week |
| `xplace:week:config` | String | None | Week metadata (cached from DB) |

### HTTP Caching

**Vercel Edge Network:**

```typescript
// GET /api/game/current
export const revalidate = 60; // 60s SWR

// GET /api/game/modes
export const revalidate = 3600; // 1hr static

// GET /api/archives
export const revalidate = 3600; // 1hr static
```

**Cache-Control Headers:**
- `current` - `public, s-maxage=60, stale-while-revalidate=120`
- `modes` - `public, s-maxage=3600, immutable`
- `archives` - `public, s-maxage=3600, stale-while-revalidate=86400`

## Performance Optimization

### Database Query Optimization

1. **Avoid N+1 Queries**
   - Archives endpoint joins `game_modes` in single query
   - `select('*, game_modes(id, name, ...)')`

2. **Pagination**
   - Default limit: 12
   - Max limit: 50
   - Offset-based (simple, works for < 10K records)

3. **Prepared Statements**
   - Supabase client uses parameterized queries
   - PostgreSQL query plan caching

### Redis Optimization

1. **Pipelining**
   - Batch delete weekly keys during rotation
   - Single round-trip for multiple operations

2. **Compression**
   - Canvas state compressed with zlib before storage
   - Reduces 125KB to ~20-30KB

3. **Connection Pooling**
   - `getRedis()` returns singleton instance
   - Persistent connection across requests

### API Response Times (Target)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `/game/current` | 50ms | 150ms | 300ms |
| `/game/upcoming` | 50ms | 150ms | 300ms |
| `/game/modes` | 30ms | 100ms | 200ms |
| `/game/rotate` | 2s | 5s | 10s |
| `/archives` | 100ms | 300ms | 500ms |

## Security & Rate Limiting

### Authentication

**Public Endpoints:**
- No auth required (RLS handles data access)
- Rate limit: 60 req/min per IP

**Protected Endpoints:**
- `/api/game/rotate` - Requires `Authorization: Bearer <SECRET>`
- Two valid secrets:
  1. `CRON_SECRET` (for Vercel Cron)
  2. `SUPABASE_SERVICE_ROLE_KEY` (for manual admin triggers)

### Row Level Security (RLS)

```sql
-- game_modes: public read
CREATE POLICY "Game modes are publicly viewable"
  ON game_modes FOR SELECT
  TO anon, authenticated
  USING (true);

-- canvas: public read
CREATE POLICY "Canvas state is publicly viewable"
  ON canvas FOR SELECT
  TO anon, authenticated
  USING (true);

-- canvas_archives: public read
CREATE POLICY "Archives are publicly viewable"
  ON canvas_archives FOR SELECT
  TO anon, authenticated
  USING (true);
```

### Input Validation

```typescript
// Pagination params
const safePage = Math.max(1, parseInt(pageParam));
const safeLimit = Math.min(50, Math.max(1, parseInt(limitParam)));

// Enum validation
const validSortOptions = ['pixels', 'reputation', 'weeks'] as const;
if (!validSortOptions.includes(sortBy)) {
  return 400 Bad Request;
}
```

## Potential Bottlenecks

### Identified Risks

1. **Archive Creation (Step 6)**
   - Bottleneck: Postgres INSERT with large JSONB metadata
   - Impact: Rotation takes 2-5s instead of < 1s
   - Mitigation: Async job queue (BullMQ + Redis)

2. **Redis Key Deletion (Step 9)**
   - Bottleneck: Delete thousands of `weekly:pixels:user:*` keys
   - Impact: Rotation timeout (> 10s)
   - Mitigation: SCAN + DEL pipeline, or background job

3. **Statistics Computation (Step 5)**
   - Bottleneck: Aggregate millions of pixel events
   - Impact: CPU spike, slow rotation
   - Mitigation: Maintain running totals (increment on each pixel)

4. **Concurrent Rotations**
   - Risk: Cron triggers twice due to network retry
   - Impact: Duplicate archives, data corruption
   - Mitigation: Redis lock with `SETNX`

### Lock Mechanism (Recommended)

```typescript
// Before rotation, acquire lock
const lockKey = 'xplace:lock:rotation';
const lockAcquired = await redis.set(lockKey, '1', {
  NX: true,  // Only set if not exists
  EX: 300,   // Expire after 5 minutes
});

if (!lockAcquired) {
  return 409 Conflict: "Rotation already in progress";
}

try {
  // ... perform rotation ...
} finally {
  await redis.del(lockKey); // Release lock
}
```

## Scaling Considerations

### Horizontal Scaling

**Current Architecture:**
- Stateless API routes (Next.js serverless functions)
- Can scale to N instances behind load balancer
- Redis/Postgres are single points (scaled vertically)

**Read Scaling:**
- Add read replicas for Postgres (Supabase supports this)
- CDN caching for `/archives`, `/modes` (99% cache hit rate)
- Edge functions for `/current` (Vercel Edge Runtime)

**Write Scaling:**
- Rotation endpoint runs once/week (low write volume)
- Pixel placements (not in this API) are write-heavy
- Use Redis sorted sets for aggregation, batch to Postgres

### Database Scaling

**Vertical (Current):**
- Supabase Pro: 8GB RAM, 4 vCPU
- Handles 1M+ archives easily

**Horizontal (Future):**
- Partition `canvas_archives` by year
- Separate analytics database (ClickHouse)
- Materialized views for leaderboards

### Redis Scaling

**Current:**
- Single Redis instance (Upstash or self-hosted)
- 256MB memory sufficient for canvas + tracking

**Future:**
- Redis Cluster (shard by user ID)
- Separate cache vs. persistence instances
- Redis Streams for event sourcing

## Technology Recommendations

### Stack Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **API Framework** | Next.js 14 App Router | Serverless, edge support, TypeScript |
| **Database** | PostgreSQL (Supabase) | JSONB support, RLS, realtime subscriptions |
| **Cache** | Redis | Atomic operations, pub/sub, sorted sets |
| **Hosting** | Vercel | Edge network, cron jobs, zero-config |
| **TypeScript** | 5.3+ | Type safety, autocomplete, refactoring |

### Alternative Considerations

**If building from scratch:**
- **FastAPI (Python)** - Simpler for data science integrations
- **Go + Fiber** - Lower latency, better concurrency
- **Cloudflare Workers** - Global edge, lower cost

**Why Next.js won:**
- Already used in project
- Unified frontend + backend codebase
- Vercel deployment simplicity

## Deployment Checklist

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=<generate-strong-secret>

# Redis (configured in lib/redis/client.ts)
REDIS_URL=redis://...
# OR
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Database Migrations

```bash
# Run migration
npx supabase migration up

# Verify tables
psql> \dt
  game_modes
  canvas
  canvas_archives
  ...
```

### Vercel Cron Setup

**vercel.json:**
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

**Cron Expression:** `0 14 * * 6`
- Minute: 0
- Hour: 14 (2 PM UTC = 9 AM EST)
- Day of Month: * (any)
- Month: * (any)
- Day of Week: 6 (Saturday)

### Monitoring

**Essential Metrics:**
- Rotation success rate (should be 100%)
- Rotation duration (target < 5s)
- API response times (p95 < 300ms)
- Cache hit rate (target > 90%)

**Alerts:**
- Rotation failure (PagerDuty)
- API error rate > 1% (Sentry)
- Database connection pool exhausted

**Tools:**
- Vercel Analytics (built-in)
- Sentry (error tracking)
- Supabase Logs (database queries)
- Upstash Console (Redis metrics)

## Testing Strategy

### Unit Tests

```typescript
// packages/shared/src/week.test.ts
describe('getNextResetTime', () => {
  it('returns next Saturday 9 AM EST', () => {
    const friday = new Date('2026-01-30T12:00:00Z');
    const reset = getNextResetTime(friday);
    expect(reset.toISOString()).toBe('2026-01-31T14:00:00.000Z');
  });
});
```

### Integration Tests

```typescript
// apps/web/src/app/api/game/__tests__/rotation.test.ts
describe('POST /api/game/rotate', () => {
  it('creates archive and updates canvas', async () => {
    const res = await fetch('/api/game/rotate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.summary.newWeek.weekNumber).toBeGreaterThan(
      data.summary.previousWeek.weekNumber
    );
  });
});
```

### E2E Tests (Playwright)

```typescript
test('displays current game mode countdown', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="game-mode"]')).toContainText('Classic Mode');
  await expect(page.locator('[data-testid="countdown"]')).toBeVisible();
});
```

## Disaster Recovery

### Backup Strategy

**Automated Backups:**
- Supabase: Daily snapshots (7-day retention)
- Redis: RDB snapshots every 6 hours
- Canvas archives: Immutable (no deletion)

**Manual Backups (Pre-Rotation):**
```bash
# Backup canvas state
redis-cli --rdb /backups/canvas-week5.rdb

# Backup Postgres
pg_dump > /backups/postgres-2026-01-31.sql
```

### Rollback Procedures

**If rotation fails mid-process:**

1. Check rotation lock: `redis-cli GET xplace:lock:rotation`
2. If locked > 5min, manually release: `redis-cli DEL xplace:lock:rotation`
3. Restore canvas from backup:
   ```bash
   redis-cli SET xplace:canvas:state "$(cat backup.txt)"
   ```
4. Revert `canvas` table:
   ```sql
   UPDATE canvas SET
     current_game_mode_id = 'classic',
     week_number = 5,
     -- ... restore previous values
   ```
5. Delete incomplete archive:
   ```sql
   DELETE FROM canvas_archives WHERE id = '<failed-archive-id>';
   ```

**If wrong game mode selected:**
```sql
UPDATE canvas SET current_game_mode_id = 'classic' WHERE id = '<canvas-id>';
```
No data loss, just incorrect mode for the week.

## Future Roadmap

### Phase 2 (Q2 2026)
- Pre-schedule multiple weeks of game modes
- Community voting on upcoming modes
- Mode-specific leaderboards

### Phase 3 (Q3 2026)
- Dynamic rule updates (mid-week tweaks)
- Custom game mode builder (admin UI)
- Event-triggered mechanics (e.g., "Flash Rush Hour")

### Phase 4 (Q4 2026)
- AI-generated game modes (LLM suggests rules)
- Cross-week achievements (play 10 different modes)
- Tournament mode (compete across modes)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-31
**Author:** aiPlaces.art Backend Team
**Review Cycle:** Quarterly
