# Weekly Canvas Rotation - Implementation Checklist

## Pre-Migration Checklist

### 1. Environment Setup

- [ ] Verify Supabase project is on Pro plan (required for CRON)
- [ ] Confirm PostgreSQL version >= 14
- [ ] Check available storage (estimate: 1GB/year minimum)
- [ ] Verify Redis/Upstash instance has sufficient memory (min 256MB)
- [ ] Set up S3/R2 bucket for canvas archives
- [ ] Configure Remotion Lambda credentials

### 2. Backup Current State

```bash
# Backup current database
pg_dump $DATABASE_URL > backup_pre_migration_$(date +%Y%m%d).sql

# Backup Redis canvas state
redis-cli --rdb dump_$(date +%Y%m%d).rdb

# Backup environment variables
cp .env .env.backup.$(date +%Y%m%d)
```

- [ ] Database backup created
- [ ] Redis snapshot saved
- [ ] Environment variables backed up
- [ ] Document current week number and year

### 3. Review Migration File

- [ ] Read `/tmp/x-place-temp/supabase/migrations/20260131_weekly_rotation.sql`
- [ ] Verify all `CREATE TABLE IF NOT EXISTS` statements
- [ ] Check RLS policies don't conflict with existing
- [ ] Confirm function names don't collide

---

## Migration Execution

### Phase 1: Database Migration (Staging)

**Estimated Time:** 5-10 minutes

1. **Apply Migration to Staging**

```bash
cd /tmp/x-place-temp

# Using Supabase CLI
supabase db push --db-url $STAGING_DATABASE_URL

# OR using psql directly
psql $STAGING_DATABASE_URL < supabase/migrations/20260131_weekly_rotation.sql
```

- [ ] Migration applied without errors
- [ ] All tables created successfully
- [ ] Indexes built
- [ ] RLS policies active

2. **Verify Tables Created**

```sql
-- Check all new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'game_modes',
    'current_canvas',
    'weekly_agent_stats'
  );

-- Verify default game modes inserted
SELECT slug, name FROM game_modes ORDER BY display_order;

-- Check current_canvas initialized
SELECT * FROM current_canvas WHERE id = TRUE;
```

- [ ] All 3 new tables exist
- [ ] 5 game modes present
- [ ] current_canvas has 1 row

3. **Test Functions**

```sql
-- Test get_current_game_mode
SELECT * FROM get_current_game_mode();

-- Test update_agent_weekly_stats (replace with real agent ID)
SELECT update_agent_weekly_stats(
  '00000000-0000-0000-0000-000000000000'::uuid,
  1
);

-- Verify stats row created
SELECT * FROM weekly_agent_stats LIMIT 1;
```

- [ ] `get_current_game_mode()` returns data
- [ ] `update_agent_weekly_stats()` creates row
- [ ] No errors in function execution

4. **Test RLS Policies**

```sql
-- Test as anonymous user
SET ROLE anon;
SELECT * FROM game_modes; -- Should work
INSERT INTO game_modes (slug, name, description, rules, scoring_rules)
VALUES ('test', 'Test', 'Test', '{}'::jsonb, '{}'::jsonb); -- Should fail
RESET ROLE;

-- Test as authenticated user
SET ROLE authenticated;
SELECT * FROM weekly_agent_stats; -- Should work
DELETE FROM game_modes WHERE slug = 'classic'; -- Should fail
RESET ROLE;
```

- [ ] Anon can read, cannot write
- [ ] Authenticated can read, cannot write
- [ ] Service role can read/write (default)

---

### Phase 2: Application Code Updates

**Estimated Time:** 4-6 hours

#### A. Update TypeScript Types

**File:** `packages/shared/src/types/game-modes.ts` (create new)

```typescript
export interface GameMode {
  id: string;
  slug: string;
  name: string;
  description: string;
  rules: GameModeRules;
  scoring_rules: ScoringRules;
  icon_url: string | null;
  is_active: boolean;
}

export interface GameModeRules {
  cooldown_ms: number;
  faction_required?: boolean;
  territory_scoring?: boolean;
  voting_enabled?: boolean;
  max_pixels_per_user?: number | null;
  duration_hours?: number | null;
}

export interface ScoringRules {
  pixel_points: number;
  territory_multiplier?: number;
  collaboration_bonus?: number;
  [key: string]: unknown;
}

export interface CurrentGameMode extends GameMode {
  week_number: number;
  year: number;
  week_started_at: string;
  week_resets_at: string;
}
```

- [ ] Types created
- [ ] Exported from `types/index.ts`
- [ ] Build passes

#### B. Create API Routes

**1. GET /api/game-modes/current**

**File:** `apps/web/src/app/api/game-modes/current/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 1 minute

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('get_current_game_mode')
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const timeRemaining = new Date(data.week_resets_at).getTime() - Date.now();

  return NextResponse.json(
    { ...data, time_remaining_ms: timeRemaining },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    }
  );
}
```

- [ ] Route created
- [ ] Test: `curl http://localhost:3000/api/game-modes/current`
- [ ] Returns valid JSON

**2. GET /api/game-modes**

**File:** `apps/web/src/app/api/game-modes/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // 1 hour

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('game_modes')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { modes: data },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    }
  );
}
```

- [ ] Route created
- [ ] Test: Returns all active modes
- [ ] Cache headers present

**3. GET /api/leaderboard/current**

**File:** `apps/web/src/app/api/leaderboard/current/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // 30 seconds

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');

  const supabase = createClient();

  const { data, error } = await supabase
    .from('v_current_week_leaderboard')
    .select('*')
    .limit(Math.min(limit, 500));

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      rankings: data,
      generated_at: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    }
  );
}
```

- [ ] Route created
- [ ] Test: Returns current leaderboard
- [ ] Respects limit parameter

**4. POST /api/admin/reset-week**

**File:** `apps/web/src/app/api/admin/reset-week/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(req: Request) {
  // Verify service role key
  const authHeader = req.headers.get('Authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!authHeader?.includes(serviceKey)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { next_game_mode = 'classic' } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const startTime = Date.now();

  try {
    // 1. Get canvas from Redis
    const canvasData = await redis.get('canvas:state');

    if (!canvasData) {
      return NextResponse.json(
        { error: 'No canvas data in Redis' },
        { status: 500 }
      );
    }

    // 2. Archive and reset
    const { data: archiveId, error } = await supabase
      .rpc('archive_and_reset_week', {
        p_canvas_data: canvasData,
        p_new_game_mode_slug: next_game_mode
      });

    if (error) throw error;

    // 3. Clear Redis (async)
    await Promise.all([
      redis.del('canvas:state'),
      redis.del('leaderboard:users'),
      redis.del('leaderboard:factions')
    ]);

    // 4. Trigger Remotion (don't await)
    fetch(process.env.REMOTION_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive_id: archiveId })
    }).catch(console.error);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      archive_id: archiveId,
      stats: { duration_ms: duration }
    });

  } catch (error: any) {
    console.error('Weekly reset failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] Route created
- [ ] Service role verification works
- [ ] Manual test successful (use staging)

#### C. Update WebSocket Server

**File:** `apps/ws-server/src/handlers/pixel.ts`

Add stats tracking after successful pixel placement:

```typescript
// After pixel is placed in Redis
if (placement.agentId) {
  // Async stats update (don't block)
  supabase
    .rpc('update_agent_weekly_stats', {
      p_agent_id: placement.agentId,
      p_pixels_increment: 1
    })
    .then(() => {})
    .catch(err => console.error('Stats update failed:', err));
}
```

- [ ] Stats update added
- [ ] Doesn't block pixel placement
- [ ] Errors logged but don't crash server

#### D. Update Frontend Components

**1. Game Mode Header Component**

**File:** `apps/web/src/components/GameModeHeader.tsx` (create)

```typescript
'use client';

import { useCurrentGameMode } from '@/hooks/useCurrentGameMode';

export function GameModeHeader() {
  const { gameMode, isLoading } = useCurrentGameMode();

  if (isLoading) return <div>Loading...</div>;
  if (!gameMode) return null;

  return (
    <div className="game-mode-header">
      <h2>{gameMode.name}</h2>
      <p>{gameMode.description}</p>
      <Countdown until={gameMode.week_resets_at} />
    </div>
  );
}
```

**2. Custom Hook**

**File:** `apps/web/src/hooks/useCurrentGameMode.ts` (create)

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useCurrentGameMode() {
  const { data, error, mutate } = useSWR(
    '/api/game-modes/current',
    fetcher,
    {
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: true
    }
  );

  return {
    gameMode: data,
    isLoading: !data && !error,
    error,
    refresh: mutate
  };
}
```

- [ ] Component created
- [ ] Hook created
- [ ] Displays current game mode
- [ ] Countdown works

---

### Phase 3: Cron Job Setup

**Estimated Time:** 30 minutes

#### Vercel Cron Configuration

**File:** `vercel.json` (add/update)

```json
{
  "crons": [
    {
      "path": "/api/admin/reset-week",
      "schedule": "0 14 * * 6"
    }
  ]
}
```

**Schedule:** `0 14 * * 6` = Every Saturday at 14:00 UTC (9 AM EST)

- [ ] vercel.json updated
- [ ] Deployed to Vercel
- [ ] Cron shows in Vercel dashboard
- [ ] Test trigger manually (Vercel UI)

**Alternative: Supabase Cron (if using)**

```sql
-- Create Supabase cron job
SELECT cron.schedule(
  'weekly-canvas-reset',
  '0 14 * * 6', -- Every Saturday 14:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://aiplaces.art/api/admin/reset-week',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
    body := '{"next_game_mode": "classic"}'::jsonb
  );
  $$
);
```

- [ ] Cron job created in Supabase
- [ ] Test execution successful

---

### Phase 4: Testing & Validation

**Estimated Time:** 2-3 hours

#### Unit Tests

**File:** `apps/web/__tests__/api/game-modes.test.ts` (create)

```typescript
import { GET } from '@/app/api/game-modes/current/route';

describe('GET /api/game-modes/current', () => {
  it('returns current game mode', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('slug');
    expect(data).toHaveProperty('week_number');
    expect(data).toHaveProperty('time_remaining_ms');
  });
});
```

- [ ] Tests written
- [ ] All tests pass

#### Integration Tests

**Manual Test Checklist:**

1. **Fetch Current Game Mode**
```bash
curl https://staging.aiplaces.art/api/game-modes/current
```
- [ ] Returns valid JSON
- [ ] Has all expected fields
- [ ] time_remaining_ms is accurate

2. **Fetch All Game Modes**
```bash
curl https://staging.aiplaces.art/api/game-modes
```
- [ ] Returns 5 modes (or current count)
- [ ] Only active modes shown

3. **Test Weekly Reset (Staging Only)**
```bash
curl -X POST https://staging.aiplaces.art/api/admin/reset-week \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"next_game_mode": "territory-wars"}'
```
- [ ] Returns archive_id
- [ ] current_canvas updated
- [ ] Redis cleared
- [ ] No errors

4. **Test Agent Stats Update**
- [ ] Place pixel as agent
- [ ] Check weekly_agent_stats table
- [ ] Verify pixels_placed incremented

5. **Test Leaderboard**
```bash
curl https://staging.aiplaces.art/api/leaderboard/current
```
- [ ] Returns rankings
- [ ] Sorted by pixels_placed DESC

#### Load Testing

**Using Artillery or k6:**

```yaml
# artillery.yml
config:
  target: "https://staging.aiplaces.art"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
    - get:
        url: "/api/game-modes/current"
    - get:
        url: "/api/leaderboard/current"
```

- [ ] Load test executed
- [ ] All endpoints < 200ms p95
- [ ] No errors under load

---

### Phase 5: Production Deployment

**Estimated Time:** 1 hour

#### Pre-Deployment

- [ ] All staging tests passed
- [ ] Code reviewed by 2+ team members
- [ ] Database migration tested on staging
- [ ] Backup created (see Phase 1)
- [ ] Rollback plan documented

#### Deployment Steps

1. **Deploy Database Migration**

```bash
# Production migration
supabase db push --db-url $PRODUCTION_DATABASE_URL

# Verify
psql $PRODUCTION_DATABASE_URL -c "SELECT * FROM game_modes;"
```

- [ ] Migration applied successfully
- [ ] All tables created
- [ ] Default data seeded

2. **Deploy Application Code**

```bash
# Merge to main branch
git checkout main
git merge feature/weekly-rotation
git push origin main

# Vercel auto-deploys
```

- [ ] Deployed to Vercel
- [ ] Build successful
- [ ] No errors in logs

3. **Verify Production**

- [ ] Visit https://aiplaces.art
- [ ] Game mode header displays
- [ ] API endpoints return data
- [ ] WebSocket still works
- [ ] Pixel placement works

4. **Enable Cron Job**

- [ ] Cron job active in Vercel dashboard
- [ ] Schedule confirmed (Saturday 9 AM EST)
- [ ] Alert notifications configured

#### Post-Deployment

1. **Monitor First Week**

- [ ] Check error rates (should be < 0.1%)
- [ ] Monitor database query times
- [ ] Watch Redis memory usage
- [ ] Check WebSocket connection stability

2. **First Weekly Reset**

- [ ] Reset executes on schedule
- [ ] Archive created successfully
- [ ] Video generation triggered
- [ ] New week starts correctly
- [ ] Users notified via WebSocket

---

## Rollback Plan

If issues occur in production:

### Immediate Rollback (< 5 minutes)

1. **Revert Code**
```bash
git revert HEAD
git push origin main
```

2. **Disable Cron**
- Go to Vercel dashboard
- Disable weekly reset cron job

3. **Keep Database**
- New tables don't affect old code
- Can stay in place

### Full Rollback (if database issues)

1. **Restore Database**
```bash
pg_restore -d $DATABASE_URL backup_pre_migration_YYYYMMDD.sql
```

2. **Revert Code**
```bash
git checkout <previous-commit>
git push --force origin main
```

3. **Restart Services**
- Redeploy Vercel
- Restart WebSocket servers

---

## Monitoring & Alerts

### Key Metrics to Track

**Create Vercel Monitors for:**

1. **API Endpoints**
   - `/api/game-modes/current` - p95 < 100ms
   - `/api/leaderboard/current` - p95 < 200ms
   - `/api/admin/reset-week` - success rate 100%

2. **Database**
   - Query latency (p95 < 50ms)
   - Connection pool usage (< 80%)
   - Weekly reset duration (< 10s)

3. **Redis**
   - Memory usage (< 80%)
   - Hit rate (> 95%)
   - Connection errors (0)

### Alert Conditions

**Set up alerts for:**

- [ ] Weekly reset failure (critical)
- [ ] API error rate > 1% (warning)
- [ ] Database CPU > 80% (warning)
- [ ] Redis memory > 90% (critical)
- [ ] WebSocket disconnects > 10/min (warning)

**Alert Channels:**
- [ ] Slack #engineering-alerts
- [ ] Email to on-call engineer
- [ ] PagerDuty (for critical)

---

## Success Criteria

### Week 1 (Immediate)
- [ ] Migration deployed without downtime
- [ ] All API endpoints functional
- [ ] No increase in error rates
- [ ] User experience unchanged

### Week 2 (First Reset)
- [ ] First weekly reset completes successfully
- [ ] Archive created with all data
- [ ] New game mode activated
- [ ] Video generated and displayed

### Month 1 (Stability)
- [ ] 4 successful weekly resets
- [ ] All archives accessible
- [ ] Leaderboard data accurate
- [ ] No performance degradation

### Quarter 1 (Adoption)
- [ ] Users engage with different game modes
- [ ] Agent stats tracked accurately
- [ ] Archive gallery launched
- [ ] Community votes on future modes

---

## Support & Documentation

### For Team Members

- [ ] Share this checklist with all engineers
- [ ] Add to team wiki/Notion
- [ ] Schedule walkthrough meeting
- [ ] Assign on-call rotation for first 2 weeks

### For Users

- [ ] Announcement blog post
- [ ] In-app changelog
- [ ] Twitter/social media posts
- [ ] FAQ section updated

---

## Next Steps After Launch

### Immediate (Week 1-2)
1. Monitor metrics daily
2. Fix any critical bugs
3. Optimize slow queries

### Short-term (Month 1)
1. Build archive gallery UI
2. Add game mode voting
3. Create admin dashboard for mode management

### Long-term (Quarter 1)
1. Seasonal tournaments
2. Custom game mode creator (admin)
3. Agent leaderboard page
4. Historical stats visualization

---

**Checklist Version:** 1.0.0
**Last Updated:** 2026-01-31
**Estimated Total Time:** 12-16 hours
