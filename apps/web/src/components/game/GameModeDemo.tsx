// @ts-nocheck - Game components with type issues pending fix
'use client';

import { useState } from 'react';
import { GameModeCard } from './GameModeCard';
import { GameRulesModal } from './GameRulesModal';
import { WeeklySchedule } from './WeeklySchedule';
import { getGameModeForWeek } from '@aiplaces/shared/types';

/**
 * GameModeDemo - Demonstration component showing all game mode components
 *
 * This is a test/demo component. To use in production, see INTEGRATION_EXAMPLE.md
 *
 * Usage:
 * Create a test page at app/game-demo/page.tsx:
 *
 * ```tsx
 * import { GameModeDemo } from '@/components/game/GameModeDemo';
 *
 * export default function GameDemoPage() {
 *   return <GameModeDemo />;
 * }
 * ```
 *
 * Then visit: http://localhost:3000/game-demo
 */
export function GameModeDemo() {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'collaborative' | 'territorial' | 'art-challenge' | 'chaos'>('collaborative');

  // Simulate week 1 (Collaborative Canvas)
  const weekNumber = 1;
  const currentMode = getGameModeForWeek(weekNumber);
  const nextMode = getGameModeForWeek(weekNumber + 1);

  // Simulate reset time (next Saturday 9 AM EST)
  const resetAt = new Date();
  resetAt.setDate(resetAt.getDate() + ((6 - resetAt.getDay() + 7) % 7 || 7));
  resetAt.setHours(9, 0, 0, 0);

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Game Mode Components Demo
          </h1>
          <p className="text-neutral-400">
            Preview all game mode display components for aiPlaces.art
          </p>
        </div>

        {/* Section 1: GameModeCard */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">1. GameModeCard</h2>
            <p className="text-sm text-neutral-400">
              Compact card showing current game mode with countdown timer
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GameModeCard
              gameMode={currentMode}
              weekNumber={weekNumber}
              resetAt={resetAt.toISOString()}
              onViewRules={() => {
                setSelectedMode(currentMode.id);
                setShowRulesModal(true);
              }}
            />

            {/* Show another mode for comparison */}
            <GameModeCard
              gameMode={getGameModeForWeek(2)}
              weekNumber={2}
              resetAt={resetAt.toISOString()}
              onViewRules={() => {
                setSelectedMode('territorial');
                setShowRulesModal(true);
              }}
            />
          </div>
        </section>

        {/* Section 2: WeeklySchedule */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">2. WeeklySchedule</h2>
            <p className="text-sm text-neutral-400">
              Shows current and upcoming game modes in a schedule view
            </p>
          </div>

          <div className="max-w-md">
            <WeeklySchedule
              currentWeek={{
                weekNumber,
                gameMode: currentMode,
                resetAt: resetAt.toISOString(),
              }}
              nextWeek={{
                weekNumber: weekNumber + 1,
                gameMode: nextMode,
              }}
              onViewCurrentRules={() => {
                setSelectedMode(currentMode.id);
                setShowRulesModal(true);
              }}
            />
          </div>
        </section>

        {/* Section 3: All Game Modes */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">3. All Game Modes</h2>
            <p className="text-sm text-neutral-400">
              Click any card to view full rules in modal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((week) => {
              const mode = getGameModeForWeek(week);
              return (
                <GameModeCard
                  key={week}
                  gameMode={mode}
                  weekNumber={week}
                  resetAt={resetAt.toISOString()}
                  onViewRules={() => {
                    setSelectedMode(mode.id);
                    setShowRulesModal(true);
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* Integration Instructions */}
        <section className="space-y-4 pt-8 border-t border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Integration Guide</h2>
            <p className="text-sm text-neutral-400">
              How to add these components to CanvasLayout
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-white">Recommended: Header Integration</h3>
            <pre className="text-xs text-neutral-300 bg-neutral-950 p-4 rounded-lg overflow-x-auto">
{`// In CanvasLayout.tsx
import { GameModeHeader } from '@/components/game/GameModeHeader';

// Add to header (desktop only):
{config && (
  <div className="hidden lg:block">
    <GameModeHeader
      weekNumber={config.weekNumber}
      resetAt={config.resetAt}
    />
  </div>
)}`}
            </pre>

            <h3 className="font-semibold text-white mt-6">Alternative: Overlay Modal</h3>
            <pre className="text-xs text-neutral-300 bg-neutral-950 p-4 rounded-lg overflow-x-auto">
{`// Add to nav tabs:
<NavTab label="Game Mode" onClick={() => setActiveOverlay('gamemode')} />

// Add overlay modal:
<OverlayModal
  isOpen={activeOverlay === 'gamemode'}
  onClose={() => setActiveOverlay(null)}
  title="Weekly Game Modes"
>
  <WeeklySchedule
    currentWeek={{...}}
    nextWeek={{...}}
  />
</OverlayModal>`}
            </pre>

            <div className="pt-4 text-sm text-neutral-400">
              <p>See <code className="text-amber-400">INTEGRATION_EXAMPLE.md</code> for detailed instructions.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Rules Modal (shared) */}
      <GameRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        gameMode={getGameModeForWeek(selectedMode === 'collaborative' ? 1 : selectedMode === 'territorial' ? 2 : selectedMode === 'art-challenge' ? 3 : 4)}
        weekNumber={selectedMode === 'collaborative' ? 1 : selectedMode === 'territorial' ? 2 : selectedMode === 'art-challenge' ? 3 : 4}
      />
    </div>
  );
}
