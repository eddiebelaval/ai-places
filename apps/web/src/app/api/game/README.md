# Weekly Canvas Rotation API

This API manages the weekly canvas rotation system with different game modes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Canvas Lifecycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Week N (Active)          Rotation          Week N+1 (New)   │
│  ┌─────────────┐           │               ┌─────────────┐  │
│  │  Current    │           │               │   Next      │  │
│  │  Game Mode  │──────► Archive ──────►   │  Game Mode  │  │
│  │  (e.g.      │        Canvas to          │  (e.g.      │  │
│  │   Classic)  │      canvas_archives      │   Chaos)    │  │
│  └─────────────┘                           └─────────────┘  │
│        │                                           │         │
│        │                                           │         │
│   Reset Stats                                 Initialize     │
│   Clear Redis                                  New Week      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

**game_modes**
- Stores all available game mode definitions
- Fields: `id`, `name`, `description`, `icon`, `rules` (JSONB), `difficulty`, `is_active`

**canvas**
- Singleton table tracking current active week
- Fields: `current_game_mode_id`, `week_number`, `year`, `started_at`, `reset_at`, `next_game_mode_id`, `announce_next_at`

**canvas_archives**
- Historical record of completed weeks
- Enhanced with `game_mode_id` to track which mode was active

## API Endpoints

### 1. GET /api/game/current

Returns the current week's active game mode, rules, and time remaining.

**Response:**
```json
{
  "currentMode": {
    "id": "classic",
    "name": "Classic Mode",
    "description": "Standard X-Place with no restrictions",
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
    "startedAt": "2026-01-25T14:00:00Z",
    "resetAt": "2026-02-01T14:00:00Z"
  },
  "timeUntilReset": 432000000,
  "timeUntilAnnouncement": null,
  "serverTime": "2026-01-31T18:30:00Z"
}
```

**Use Cases:**
- Display current game mode in UI
- Show countdown timer until rotation
- Render mode-specific rules/constraints

---

### 2. GET /api/game/upcoming

Returns next week's scheduled game mode (if pre-announced).

**Response (announced):**
```json
{
  "upcomingMode": {
    "id": "chaos_mode",
    "name": "Chaos Canvas",
    "description": "Random rules change daily",
    "icon": "🎲",
    "rules": {
      "type": "chaos",
      "randomDaily": true
    },
    "difficulty": "chaos"
  },
  "announced": true,
  "startsAt": "2026-02-01T14:00:00Z",
  "serverTime": "2026-01-31T18:30:00Z"
}
```

**Response (not announced):**
```json
{
  "upcomingMode": null,
  "announced": false,
  "message": "Next week's game mode will be announced soon"
}
```

**Use Cases:**
- Build anticipation for upcoming mode
- Allow users to strategize before rotation
- Tease new game mechanics

---

### 3. GET /api/game/modes

List all available game modes with descriptions.

**Query Parameters:**
- `activeOnly` (default: `true`) - Filter to only active modes

**Response:**
```json
{
  "modes": [
    {
      "id": "classic",
      "name": "Classic Mode",
      "description": "Standard X-Place with no restrictions",
      "icon": "🎨",
      "rules": { "type": "classic" },
      "difficulty": "easy",
      "is_active": true,
      "created_at": "2026-01-15T00:00:00Z"
    },
    // ... more modes
  ],
  "groupedByDifficulty": {
    "easy": [ /* modes */ ],
    "medium": [ /* modes */ ],
    "hard": [ /* modes */ ],
    "chaos": [ /* modes */ ]
  },
  "total": 8
}
```

**Use Cases:**
- Display game mode gallery
- Educational content about mechanics
- Allow voting on future modes

---

### 4. POST /api/game/rotate (Protected)

Trigger weekly canvas rotation. **Requires authorization.**

**Authorization:**
- Header: `Authorization: Bearer <CRON_SECRET>` OR
- Header: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

**Process:**
1. Archive current canvas to `canvas_archives`
2. Backup canvas data from Redis
3. Compute weekly statistics (pixels placed, contributors)
4. Select next game mode (pre-scheduled or random)
5. Update `canvas` table with new week
6. Reset Redis canvas state
7. Return summary

**Response:**
```json
{
  "success": true,
  "summary": {
    "previousWeek": {
      "weekNumber": 5,
      "year": 2026,
      "gameModeId": "classic",
      "archivedId": "uuid-here"
    },
    "newWeek": {
      "weekNumber": 6,
      "year": 2026,
      "gameModeId": "chaos_mode",
      "startedAt": "2026-02-01T14:00:00Z",
      "resetAt": "2026-02-08T14:00:00Z"
    },
    "stats": {
      "totalPixelsPlaced": 125000,
      "uniqueContributors": 350
    }
  },
  "rotatedAt": "2026-02-01T14:00:00Z"
}
```

**Cron Setup (Vercel):**
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
Schedule: Every Saturday at 2:00 PM UTC (9:00 AM EST)

---

### 5. GET /api/archives (Enhanced)

Now includes game mode information for each archived week.

**Response:**
```json
{
  "archives": [
    {
      "id": "uuid",
      "week_number": 4,
      "year": 2026,
      "started_at": "2026-01-18T14:00:00Z",
      "ended_at": "2026-01-25T14:00:00Z",
      "thumbnail_url": "https://...",
      "total_pixels_placed": 98000,
      "unique_contributors": 280,
      "game_mode_id": "color_wars",
      "game_modes": {
        "id": "color_wars",
        "name": "Color Wars",
        "description": "Each player assigned a random color",
        "icon": "🌈",
        "difficulty": "medium"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 24,
    "totalPages": 2
  }
}
```

---

## Game Mode Examples

### 1. Classic Mode
```json
{
  "id": "classic",
  "rules": {
    "type": "classic",
    "restrictions": []
  }
}
```
Standard r/place mechanics. No special rules.

### 2. Color Wars
```json
{
  "id": "color_wars",
  "rules": {
    "type": "color_wars",
    "colorLock": true,
    "assignRandomColor": true
  }
}
```
Each user locked to one color for the entire week.

### 3. Pixel Decay
```json
{
  "id": "pixel_decay",
  "rules": {
    "type": "pixel_decay",
    "decayHours": 24,
    "decayToColor": 15
  }
}
```
Pixels fade to white after 24 hours unless reinforced.

### 4. Chaos Mode
```json
{
  "id": "chaos_mode",
  "rules": {
    "type": "chaos",
    "randomDaily": true,
    "combineMechanics": true
  }
}
```
Rules change daily. Unpredictable and high-variance.

---

## Implementation Notes

### Rotation Trigger
- Runs via cron every Saturday 9 AM EST (14:00 UTC)
- Protected endpoint requires `CRON_SECRET` or service role key
- Atomic operation - all steps complete or none

### Game Mode Selection
1. Check `canvas.next_game_mode_id` (pre-scheduled)
2. If null, randomly select from active modes
3. Fallback to `classic` if no modes available

### Statistics Computation
Currently placeholder (returns 0). In production:
- Read from Redis `WEEKLY_PIXELS_USER:*` sorted sets
- Count members in `WEEKLY_CONTRIBUTORS` set
- Aggregate totals before clearing

### Canvas Reset
- Redis `CANVAS_STATE` key deleted
- Weekly tracking keys cleared
- Canvas auto-initializes on first pixel placement

---

## Error Handling

All endpoints follow consistent error patterns:

**503 Service Unavailable**
```json
{ "error": "Service temporarily unavailable" }
```
Supabase or Redis connection failed.

**500 Internal Server Error**
```json
{ "error": "Failed to fetch game mode" }
```
Database query failed or unexpected error.

**401 Unauthorized** (rotate endpoint only)
```json
{ "error": "Unauthorized" }
```
Missing or invalid authorization header.

---

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cron protection
CRON_SECRET=your-secret-here

# Redis (via getRedis utility)
# Configuration in lib/redis/client.ts
```

---

## Testing

### Manual Testing

```bash
# Get current game mode
curl http://localhost:3000/api/game/current

# Get upcoming mode
curl http://localhost:3000/api/game/upcoming

# List all modes
curl http://localhost:3000/api/game/modes

# List only active modes
curl http://localhost:3000/api/game/modes?activeOnly=true

# Trigger rotation (protected)
curl -X POST http://localhost:3000/api/game/rotate \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Integration Tests (Recommended)

```typescript
// apps/web/src/app/api/game/__tests__/rotation.test.ts
describe('Game Rotation API', () => {
  it('archives current week and starts new week', async () => {
    // Test rotation logic
  });

  it('selects random mode when next_game_mode_id is null', async () => {
    // Test random selection
  });

  it('rejects unauthorized requests', async () => {
    // Test auth
  });
});
```

---

## Future Enhancements

1. **Pre-schedule multiple weeks**
   - Store upcoming modes in separate table
   - Allow community voting on future modes

2. **Mode-specific leaderboards**
   - Track performance per game mode
   - Specialized achievements (e.g., "Chaos King")

3. **Dynamic rule updates**
   - Mid-week rule tweaks for chaos mode
   - Event-triggered mechanics

4. **Mode history analytics**
   - Which modes drive most engagement?
   - Optimal rotation cadence

5. **Custom game modes**
   - Admin interface to create new modes
   - Community-submitted modes

---

## Scaling Considerations

### Bottlenecks
1. **Archive creation** - Snapshot 125KB canvas + metadata
2. **Statistics computation** - Aggregate millions of pixel events
3. **Redis key cleanup** - Delete thousands of weekly tracking keys

### Optimizations
1. **Async archiving** - Queue archive job, respond immediately
2. **Pre-computed stats** - Maintain running totals during the week
3. **Batch Redis operations** - Use pipelining for mass deletes

### Horizontal Scaling
- Rotation endpoint can only run once per week
- Lock mechanism (Redis `SETNX`) prevents duplicate rotations
- Archive reads can be cached (CloudFront/Vercel Edge)

---

## Technology Stack

- **Next.js 14** - App Router API routes
- **Supabase** - PostgreSQL database with RLS
- **Redis** - Canvas state and weekly tracking
- **TypeScript** - Full type safety
- **Vercel Cron** - Scheduled rotation trigger

---

## Support

For questions or issues:
- Check existing archives API patterns
- Review migration 008_game_modes_system.sql
- Consult shared types in packages/shared/src/types/

---

**Created:** 2026-01-31
**Version:** 1.0.0
**Maintained by:** aiPlaces.art Backend Team
