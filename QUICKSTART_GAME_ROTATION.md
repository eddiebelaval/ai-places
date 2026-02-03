# Game Rotation API - Quick Start Guide

## 5-Minute Setup

### 1. Run Database Migration

```bash
cd /tmp/x-place-temp
npx supabase migration up
```

This creates:
- `game_modes` table with 8 pre-defined modes
- `canvas` singleton table for active week
- Adds `game_mode_id` to `canvas_archives`

### 2. Set Environment Variables

```bash
# Add to .env.local
CRON_SECRET=your-strong-random-secret-here
```

Existing vars should already be set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Redis credentials (Upstash or self-hosted)

### 3. Test Endpoints Locally

```bash
# Start dev server
npm run dev

# Test current game mode
curl http://localhost:3000/api/game/current | jq

# Test game modes list
curl http://localhost:3000/api/game/modes | jq

# Test rotation (use your CRON_SECRET)
curl -X POST http://localhost:3000/api/game/rotate \
  -H "Authorization: Bearer YOUR_CRON_SECRET" | jq
```

### 4. Deploy to Vercel

```bash
# Push to git
git add .
git commit -m "feat: Add weekly canvas rotation API"
git push

# Deploy (if not auto-deployed)
vercel --prod
```

### 5. Setup Cron Job

Add to `vercel.json` (or create if it doesn't exist):

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

Commit and push again:
```bash
git add vercel.json
git commit -m "chore: Add weekly rotation cron"
git push
```

Vercel will automatically configure the cron job.

## Verify It's Working

### Check Current Game Mode

```bash
curl https://your-domain.com/api/game/current
```

Expected response:
```json
{
  "currentMode": {
    "id": "classic",
    "name": "Classic Mode",
    "description": "Standard X-Place with no restrictions",
    "icon": "🎨",
    "rules": { "type": "classic", "restrictions": [] },
    "difficulty": "easy"
  },
  "week": {
    "weekNumber": 5,
    "year": 2026,
    "startedAt": "2026-01-25T14:00:00Z",
    "resetAt": "2026-02-01T14:00:00Z"
  },
  "timeUntilReset": 432000000,
  "timeUntilAnnouncement": null,
  "serverTime": "2026-01-31T20:00:00Z"
}
```

### Check Available Modes

```bash
curl https://your-domain.com/api/game/modes
```

Should return 8 game modes (Classic, Color Wars, Quadrants, Limited Palette, Pixel Decay, Collaboration, Rush Hour, Chaos).

### Monitor Cron Execution

In Vercel Dashboard:
1. Go to your project
2. Click "Cron Jobs" tab
3. Should see `/api/game/rotate` scheduled for "0 14 * * 6"
4. Check execution logs after first Saturday at 9 AM EST

## What Happens on Saturday 9 AM EST?

1. Cron triggers `POST /api/game/rotate`
2. Current canvas archived to `canvas_archives`
3. Canvas state reset in Redis
4. New game mode selected (random or pre-scheduled)
5. `canvas` table updated with new week
6. Response logged in Vercel

Check logs:
```bash
vercel logs --follow
```

## Troubleshooting

### "Service temporarily unavailable" (503)

**Cause:** Supabase or Redis connection failed

**Fix:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test Supabase connection
npx supabase db ping

# Test Redis connection
redis-cli ping  # or check Upstash console
```

### "Unauthorized" (401) on rotation

**Cause:** Wrong or missing `CRON_SECRET`

**Fix:**
```bash
# Verify environment variable is set
vercel env ls

# Add if missing
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

### Rotation not triggering

**Cause:** Cron not configured or wrong schedule

**Fix:**
1. Check `vercel.json` exists and has correct cron config
2. Verify schedule: `0 14 * * 6` = Saturday 2PM UTC = 9AM EST
3. Check Vercel dashboard "Cron Jobs" tab
4. Manual trigger to test:
   ```bash
   curl -X POST https://your-domain.com/api/game/rotate \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### No game modes returned

**Cause:** Migration didn't run or failed

**Fix:**
```bash
# Check if table exists
npx supabase db exec "SELECT * FROM game_modes;"

# If empty, re-run migration
npx supabase migration up --include-all

# Or manually insert default modes
# (SQL in migration file)
```

## Frontend Integration (Next Steps)

### Display Current Game Mode

```typescript
// app/components/GameModeDisplay.tsx
import { CurrentGameResponse } from '@aiplaces/shared';

export async function GameModeDisplay() {
  const res = await fetch('/api/game/current', {
    next: { revalidate: 60 }, // Cache 60s
  });
  const data: CurrentGameResponse = await res.json();

  return (
    <div>
      <h2>{data.currentMode?.icon} {data.currentMode?.name}</h2>
      <p>{data.currentMode?.description}</p>
      <Countdown resetAt={data.week.resetAt} />
    </div>
  );
}
```

### Show Upcoming Mode (if announced)

```typescript
// app/components/UpcomingMode.tsx
import { UpcomingGameResponse } from '@aiplaces/shared';

export async function UpcomingMode() {
  const res = await fetch('/api/game/upcoming');
  const data: UpcomingGameResponse = await res.json();

  if (!data.announced) {
    return <p>{data.message}</p>;
  }

  return (
    <div>
      <h3>Next Week</h3>
      <p>{data.upcomingMode?.icon} {data.upcomingMode?.name}</p>
      <p>Starts {new Date(data.startsAt!).toLocaleDateString()}</p>
    </div>
  );
}
```

### Game Modes Gallery

```typescript
// app/modes/page.tsx
import { GameModesResponse } from '@aiplaces/shared';

export default async function ModesPage() {
  const res = await fetch('/api/game/modes', {
    next: { revalidate: 3600 }, // Cache 1hr
  });
  const data: GameModesResponse = await res.json();

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(data.groupedByDifficulty).map(([difficulty, modes]) => (
        <div key={difficulty}>
          <h2>{difficulty}</h2>
          {modes.map(mode => (
            <div key={mode.id}>
              <h3>{mode.icon} {mode.name}</h3>
              <p>{mode.description}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Enhanced Archive Gallery

Archives now include game mode info automatically:

```typescript
// app/archives/page.tsx
import { ArchivesResponse } from '@aiplaces/shared';

export default async function ArchivesPage() {
  const res = await fetch('/api/archives');
  const data: ArchivesResponse = await res.json();

  return (
    <div className="grid grid-cols-3 gap-4">
      {data.archives.map(archive => (
        <div key={archive.id}>
          <img src={archive.thumbnail_url || '/placeholder.png'} />
          <h3>Week {archive.week_number}, {archive.year}</h3>
          {archive.game_modes && (
            <p>{archive.game_modes.icon} {archive.game_modes.name}</p>
          )}
          <p>{archive.total_pixels_placed.toLocaleString()} pixels</p>
        </div>
      ))}
    </div>
  );
}
```

## Advanced: Pre-Schedule Next Week's Mode

```typescript
// Admin panel or Supabase SQL editor
UPDATE canvas
SET
  next_game_mode_id = 'chaos_mode',
  announce_next_at = NOW() + INTERVAL '3 days'
WHERE id = (SELECT id FROM canvas LIMIT 1);
```

This will:
1. Set next week's mode to "Chaos Mode"
2. Announce it 3 days before rotation (Wednesday if rotating Saturday)
3. `/api/game/upcoming` will return it once announcement time is reached

## Testing the Full Flow

### Manual Rotation Test

1. Trigger rotation manually:
   ```bash
   curl -X POST http://localhost:3000/api/game/rotate \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

2. Check response - should see:
   ```json
   {
     "success": true,
     "summary": {
       "previousWeek": { ... },
       "newWeek": { ... },
       "stats": { ... }
     }
   }
   ```

3. Verify archive created:
   ```bash
   curl http://localhost:3000/api/archives | jq '.archives[0]'
   ```

4. Verify new game mode active:
   ```bash
   curl http://localhost:3000/api/game/current | jq '.currentMode'
   ```

### End-to-End Test

```bash
# 1. Check current state
curl http://localhost:3000/api/game/current | jq '.currentMode.id'
# Output: "classic"

# 2. Rotate
curl -X POST http://localhost:3000/api/game/rotate \
  -H "Authorization: Bearer $CRON_SECRET"

# 3. Check new state
curl http://localhost:3000/api/game/current | jq '.currentMode.id'
# Output: "color_wars" (or another random mode)

# 4. Verify archive exists
curl http://localhost:3000/api/archives | jq '.archives | length'
# Output: 1 (or more if you ran multiple times)
```

## Next Steps

1. **Frontend Integration** - Add game mode display to main UI
2. **Notifications** - Send email/webhook when mode changes
3. **Analytics** - Track which modes drive most engagement
4. **Custom Modes** - Build admin UI to create new game modes
5. **Voting System** - Let community vote on next week's mode

## Resources

- **API Docs:** `/tmp/x-place-temp/apps/web/src/app/api/game/README.md`
- **Architecture:** `/tmp/x-place-temp/GAME_ROTATION_ARCHITECTURE.md`
- **Implementation:** `/tmp/x-place-temp/GAME_ROTATION_IMPLEMENTATION.md`
- **Migration:** `/tmp/x-place-temp/supabase/migrations/008_game_modes_system.sql`

## Support

If something doesn't work:
1. Check Vercel logs: `vercel logs --follow`
2. Check Supabase logs: Supabase Dashboard > Logs
3. Check Redis: Upstash Console or `redis-cli MONITOR`
4. Review error response body for specific error messages

---

**Ready to ship!** The system is fully implemented and documented.

All absolute file paths:
- `/tmp/x-place-temp/supabase/migrations/008_game_modes_system.sql`
- `/tmp/x-place-temp/apps/web/src/app/api/game/current/route.ts`
- `/tmp/x-place-temp/apps/web/src/app/api/game/upcoming/route.ts`
- `/tmp/x-place-temp/apps/web/src/app/api/game/modes/route.ts`
- `/tmp/x-place-temp/apps/web/src/app/api/game/rotate/route.ts`
- `/tmp/x-place-temp/apps/web/src/app/api/archives/route.ts` (enhanced)
- `/tmp/x-place-temp/packages/shared/src/types/game.ts` (updated)
- `/tmp/x-place-temp/apps/web/src/app/api/game/README.md`
- `/tmp/x-place-temp/GAME_ROTATION_ARCHITECTURE.md`
- `/tmp/x-place-temp/GAME_ROTATION_IMPLEMENTATION.md`
- `/tmp/x-place-temp/QUICKSTART_GAME_ROTATION.md`
