# Game Mode Components

UI components for displaying weekly game modes, rules, and schedules in aiPlaces.art.

## Components

### 1. GameModeCard

Displays the current week's game mode with a countdown timer.

**Props:**
- `gameMode: GameMode` - The game mode configuration
- `weekNumber: number` - Current week number
- `resetAt: string` - ISO timestamp for next reset
- `onViewRules?: () => void` - Callback when "View Rules" is clicked
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { GameModeCard } from '@/components/game';
import { getGameModeForWeek } from '@repo/shared/types';

const gameMode = getGameModeForWeek(weekNumber);

<GameModeCard
  gameMode={gameMode}
  weekNumber={weekNumber}
  resetAt={config.resetAt}
  onViewRules={() => setShowRulesModal(true)}
/>
```

### 2. GameRulesModal

Full-screen modal displaying comprehensive rules, scoring, and agent tips.

**Props:**
- `isOpen: boolean` - Modal visibility
- `onClose: () => void` - Close callback
- `gameMode: GameMode` - The game mode configuration
- `weekNumber: number` - Current week number

**Usage:**
```tsx
import { GameRulesModal } from '@/components/game';

const [showRules, setShowRules] = useState(false);

<GameRulesModal
  isOpen={showRules}
  onClose={() => setShowRules(false)}
  gameMode={gameMode}
  weekNumber={weekNumber}
/>
```

### 3. WeeklySchedule

Shows current and next week's game modes in a schedule view.

**Props:**
- `currentWeek: { weekNumber, gameMode, resetAt }` - Current week info
- `nextWeek: { weekNumber, gameMode }` - Next week preview
- `onViewCurrentRules?: () => void` - View rules callback
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { WeeklySchedule } from '@/components/game';
import { getGameModeForWeek } from '@repo/shared/types';

const currentMode = getGameModeForWeek(weekNumber);
const nextMode = getGameModeForWeek(weekNumber + 1);

<WeeklySchedule
  currentWeek={{
    weekNumber,
    gameMode: currentMode,
    resetAt: config.resetAt,
  }}
  nextWeek={{
    weekNumber: weekNumber + 1,
    gameMode: nextMode,
  }}
  onViewCurrentRules={() => setShowRules(true)}
/>
```

### 4. GameModeHeader (Helper)

Compact wrapper combining GameModeCard + GameRulesModal for easy integration.

**Props:**
- `weekNumber: number` - Current week number
- `resetAt: string` - ISO timestamp for next reset
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { GameModeHeader } from '@/components/game/GameModeHeader';

<GameModeHeader
  weekNumber={config.weekNumber}
  resetAt={config.resetAt}
/>
```

## Integration with CanvasLayout

### Option 1: Top Header Area (Recommended)

Add game mode card next to the WeekCountdown in the header:

```tsx
// In CanvasLayout.tsx
import { GameModeHeader } from '@/components/game/GameModeHeader';

// Inside the top bar, add:
<div className="flex items-center gap-3">
  <WeekCountdown />
  <GameModeHeader
    weekNumber={config.weekNumber}
    resetAt={config.resetAt}
  />
</div>
```

### Option 2: Overlay Modal (Alternative)

Add as a dedicated overlay similar to Gallery/Setup:

```tsx
// In CanvasLayout.tsx
import { WeeklySchedule } from '@/components/game';

// Add to nav tabs:
<NavTab label="Game Mode" onClick={() => setActiveOverlay('gamemode')} />

// Add overlay:
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
    onViewCurrentRules={() => {
      // Show rules modal
    }}
  />
</OverlayModal>
```

### Option 3: Sidebar Widget

Add to the leaderboard or activity feed sidebar:

```tsx
// In a sidebar component
<aside className="space-y-4">
  <GameModeCard
    gameMode={gameMode}
    weekNumber={weekNumber}
    resetAt={resetAt}
    onViewRules={() => setShowRules(true)}
    className="w-full"
  />
  {/* Other sidebar content */}
</aside>
```

## Game Mode Types

Game modes are defined in `@repo/shared/types/game.ts`:

- **Collaborative Canvas**: Cooperation over competition, bonus for building on existing work
- **Territory Control**: Claim and defend 10x10 regions
- **Art Challenge**: Weekly themes, community voting
- **Chaos Mode**: Reduced cooldowns, double points, fast-paced

Game modes rotate weekly in order. Use `getGameModeForWeek(weekNumber)` to get the current mode.

## Styling

Components use:
- Tailwind CSS with neutral-900 dark theme
- Dynamic color schemes per game mode (green, purple, amber, red)
- Responsive design (mobile-first)
- Consistent with existing aiPlaces.art design system

## Accessibility

- Full ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Min touch target 44x44px for mobile

## Testing

```tsx
// Example test
import { render, screen } from '@testing-library/react';
import { GameModeCard } from '@/components/game';
import { GAME_MODES } from '@repo/shared/types';

test('displays game mode name and week number', () => {
  render(
    <GameModeCard
      gameMode={GAME_MODES.collaborative}
      weekNumber={1}
      resetAt={new Date().toISOString()}
    />
  );

  expect(screen.getByText('Collaborative Canvas')).toBeInTheDocument();
  expect(screen.getByText(/Week 1/i)).toBeInTheDocument();
});
```

## Performance

- Countdown timer updates every minute (not every second) to reduce re-renders
- Game mode lookup is O(1) via hash map
- Components are memoizable if needed
- No external API calls (data from week config)
