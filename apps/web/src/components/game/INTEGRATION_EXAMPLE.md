# Integration Example: Adding Game Mode to CanvasLayout

## Recommended Approach: Header Integration

The cleanest integration is to add the game mode display next to the existing `WeekCountdown` in the CanvasLayout header.

### Step 1: Import the component

```tsx
// At the top of apps/web/src/components/layout/CanvasLayout.tsx
import { GameModeHeader } from '@/components/game/GameModeHeader';
import { useWeekStore } from '@/stores/week-store';
```

### Step 2: Get week config from store

The `useWeekStore` already provides the week configuration:

```tsx
export function CanvasLayout() {
  // ... existing code

  // Access week config (already available if WeekCountdown is working)
  const { config } = useWeekStore();

  // ... rest of component
}
```

### Step 3: Add GameModeHeader to the header

Find the header section (around line 128-144) and add the game mode display:

```tsx
{/* Right side: Controls */}
<div className="flex items-center gap-1.5 md:gap-3 pointer-events-auto">
  {/* Mobile hamburger menu */}
  <button
    onClick={() => setShowMobileNav(!showMobileNav)}
    className="md:hidden p-2.5 hover:bg-neutral-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
    title="Menu"
    aria-label="Toggle menu"
    aria-expanded={showMobileNav}
  >
    <MenuIcon className="w-6 h-6 text-neutral-400" />
  </button>

  {/* ADDITION: Game Mode Card - hidden on small mobile */}
  {config && (
    <div className="hidden lg:block">
      <GameModeHeader
        weekNumber={config.weekNumber}
        resetAt={config.resetAt}
      />
    </div>
  )}

  {/* Week Countdown - hidden on small mobile */}
  <div className="hidden sm:block">
    <WeekCountdown />
  </div>

  {/* ... rest of controls */}
</div>
```

### Visual Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] [Connection]    [Gallery] [Setup] [Archives]             │
│                                                                   │
│          [Game Mode Card]  [Week Countdown]  [Activity] [Board]  │
└─────────────────────────────────────────────────────────────────┘
```

### Visual Layout (Mobile)

The game mode card is hidden on mobile (`hidden lg:block`) to avoid clutter. Mobile users can access it via:

**Option A: Add to Mobile Menu**

```tsx
{/* Mobile dropdown menu */}
{showMobileNav && (
  <div className="md:hidden absolute top-full left-0 right-0 bg-neutral-950 border-b border-neutral-800 pointer-events-auto">
    <nav className="p-3 space-y-2" aria-label="Mobile navigation">
      {/* Existing nav items */}
      <MobileNavButton label="Gallery" onClick={() => { ... }} />
      <MobileNavButton label="Setup" onClick={() => { ... }} />
      <MobileNavButton label="Archives" onClick={() => { ... }} />

      {/* NEW: Game Mode button */}
      {config && (
        <button
          onClick={() => {
            // Open game mode overlay
            setActiveOverlay('gamemode');
            setShowMobileNav(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg border border-amber-600/40 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors min-h-[44px]"
        >
          <GameIcon className="w-5 h-5 text-amber-500" />
          This Week: {getGameModeForWeek(config.weekNumber).name}
        </button>
      )}
    </nav>
  </div>
)}
```

**Option B: Replace WeekCountdown on Mobile**

Show game mode instead of countdown on small screens:

```tsx
{/* Game Mode (mobile) OR Week Countdown (desktop) */}
<div className="hidden sm:block">
  {/* Desktop: show countdown */}
  <div className="hidden lg:block">
    <WeekCountdown />
  </div>

  {/* Tablet: show compact game mode */}
  {config && (
    <div className="lg:hidden">
      <GameModeHeader
        weekNumber={config.weekNumber}
        resetAt={config.resetAt}
        className="max-w-xs"
      />
    </div>
  )}
</div>
```

## Alternative: Overlay Modal Approach

If header space is too crowded, add game mode as a dedicated overlay:

### Step 1: Add state for game mode overlay

```tsx
export function CanvasLayout() {
  // ... existing code

  // Add 'gamemode' to OverlayType
  type OverlayType = 'gallery' | 'setup' | 'archives' | 'gamemode' | null;

  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
}
```

### Step 2: Add nav button

```tsx
{/* Center: Desktop nav (hidden on mobile) */}
<nav className="pointer-events-auto hidden md:flex flex-1 items-center justify-center px-2">
  <div className="flex items-center gap-1.5 rounded-xl bg-neutral-900/70 border border-neutral-800 px-1.5 py-1">
    <NavTab label="Gallery" onClick={() => setActiveOverlay('gallery')} />
    <NavTab label="Game Mode" onClick={() => setActiveOverlay('gamemode')} />
    <NavTab label="Setup" onClick={() => setActiveOverlay('setup')} />
    <NavTab label="Archives" onClick={() => setActiveOverlay('archives')} />
  </div>
</nav>
```

### Step 3: Add overlay modal

```tsx
{/* Game Mode Overlay */}
{config && (
  <OverlayModal
    isOpen={activeOverlay === 'gamemode'}
    onClose={() => setActiveOverlay(null)}
    title="Weekly Game Modes"
    subtitle="Rotation schedule and rules"
  >
    <WeeklySchedule
      currentWeek={{
        weekNumber: config.weekNumber,
        gameMode: getGameModeForWeek(config.weekNumber),
        resetAt: config.resetAt,
      }}
      nextWeek={{
        weekNumber: config.weekNumber + 1,
        gameMode: getGameModeForWeek(config.weekNumber + 1),
      }}
    />
  </OverlayModal>
)}
```

## Import Requirements

Make sure to add these imports at the top of CanvasLayout:

```tsx
import { GameModeHeader } from '@/components/game/GameModeHeader';
import { WeeklySchedule } from '@/components/game';
import { getGameModeForWeek } from '@repo/shared/types';
```

## Testing the Integration

1. Start the dev server: `npm run dev`
2. Navigate to the canvas page
3. You should see the game mode card in the header (desktop) or mobile menu
4. Click "View Rules" to open the rules modal
5. Verify countdown timer updates
6. Check responsive behavior on mobile

## Design Considerations

- **Header clutter**: The header is already dense. Consider showing only on desktop (lg breakpoint)
- **Mobile UX**: Use overlay modal or mobile menu for game mode info
- **Visual hierarchy**: Game mode is important but shouldn't compete with canvas
- **Performance**: Components are lightweight, no API calls needed

## Recommended Implementation Order

1. Start with **header integration** (desktop only)
2. Add **mobile menu button** for game mode overlay
3. Test responsiveness across breakpoints
4. Optionally add **WeeklySchedule** to a sidebar widget
5. Gather user feedback on placement
