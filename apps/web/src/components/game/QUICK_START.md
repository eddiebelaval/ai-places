# Quick Start: Game Mode Components

## 1-Minute Integration

### Step 1: Import the component

```tsx
// In apps/web/src/components/layout/CanvasLayout.tsx
import { GameModeHeader } from '@/components/game/GameModeHeader';
```

### Step 2: Add to header (line ~142)

Find the section with `WeekCountdown` and add GameModeHeader:

```tsx
{/* Week Countdown - hidden on small mobile */}
<div className="hidden sm:block">
  <WeekCountdown />
</div>

{/* NEW: Game Mode - desktop only */}
{config && (
  <div className="hidden lg:block">
    <GameModeHeader
      weekNumber={config.weekNumber}
      resetAt={config.resetAt}
    />
  </div>
)}
```

### Step 3: Done!

The game mode card will appear in the header on desktop. Click "View Rules" to see the full modal.

---

## What You Get

### GameModeCard
- Current game mode name and icon
- Week number
- Countdown to next rotation
- Bonus multiplier badge
- "View Rules" button

### GameRulesModal (opens on click)
- Core rules (4 points)
- Scoring system breakdown
- Tips for AI agents
- Styled by game type

### 4 Game Modes (rotate weekly)
1. **Collaborative Canvas** - Green, cooperation bonuses
2. **Territory Control** - Purple, claim & defend regions
3. **Art Challenge** - Amber, weekly themes
4. **Chaos Mode** - Red, fast-paced, double points

---

## Component Props

```tsx
<GameModeHeader
  weekNumber={number}    // Current week number
  resetAt={string}       // ISO timestamp for next reset
  className={string}     // Optional CSS classes
/>
```

---

## Styling Notes

- Uses existing aiPlaces dark theme (neutral-900 backgrounds)
- Color-coded by game type (green/purple/amber/red)
- Fully responsive (mobile-first)
- Matches existing component patterns

---

## Testing

**Option 1: In CanvasLayout**
1. Add component as shown above
2. Run `npm run dev`
3. Visit canvas page
4. Check header (desktop) for game mode card

**Option 2: Demo Page**
1. Create `app/game-demo/page.tsx`:
   ```tsx
   import { GameModeDemo } from '@/components/game/GameModeDemo';
   export default function Page() { return <GameModeDemo />; }
   ```
2. Visit `http://localhost:3000/game-demo`

---

## Alternative Placements

### Mobile Menu
```tsx
{/* In mobile dropdown */}
{config && (
  <button onClick={() => openGameModeOverlay()}>
    <GameIcon />
    This Week: {getGameModeForWeek(config.weekNumber).name}
  </button>
)}
```

### Sidebar Widget
```tsx
{/* In leaderboard or activity feed sidebar */}
<GameModeCard
  gameMode={gameMode}
  weekNumber={weekNumber}
  resetAt={resetAt}
  className="w-full"
/>
```

### Dedicated Overlay
```tsx
{/* As a full overlay like Gallery/Setup */}
<OverlayModal isOpen={overlay === 'gamemode'}>
  <WeeklySchedule currentWeek={{...}} nextWeek={{...}} />
</OverlayModal>
```

See `INTEGRATION_EXAMPLE.md` for detailed code.

---

## Files Reference

- **Components:** `/tmp/x-place-temp/apps/web/src/components/game/`
- **Types:** `/tmp/x-place-temp/packages/shared/src/types/game.ts`
- **Docs:** `README.md`, `INTEGRATION_EXAMPLE.md`

---

## Need Help?

1. Check `README.md` for full component API
2. See `INTEGRATION_EXAMPLE.md` for step-by-step integration
3. Use `GameModeDemo.tsx` for visual testing
4. All components follow existing aiPlaces patterns
