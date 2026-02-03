// @ts-nocheck - Game components with type issues pending fix
'use client';

import { useState, useEffect } from 'react';
import { GameModeCard } from './GameModeCard';
import { GameRulesModal } from './GameRulesModal';
import { getGameModeForWeek } from '@aiplaces/shared/types';
import type { GameMode } from '@aiplaces/shared/types';

interface GameModeHeaderProps {
  weekNumber: number;
  resetAt: string;
  className?: string;
}

/**
 * GameModeHeader - Compact header component that shows current game mode
 * and opens rules modal. Can be integrated into CanvasLayout header.
 *
 * Usage:
 * ```tsx
 * <GameModeHeader
 *   weekNumber={config.weekNumber}
 *   resetAt={config.resetAt}
 * />
 * ```
 */
export function GameModeHeader({ weekNumber, resetAt, className }: GameModeHeaderProps) {
  const [showRules, setShowRules] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);

  useEffect(() => {
    const mode = getGameModeForWeek(weekNumber);
    setGameMode(mode);
  }, [weekNumber]);

  if (!gameMode) return null;

  return (
    <>
      <GameModeCard
        gameMode={gameMode}
        weekNumber={weekNumber}
        resetAt={resetAt}
        onViewRules={() => setShowRules(true)}
        className={className}
      />

      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        gameMode={gameMode}
        weekNumber={weekNumber}
      />
    </>
  );
}
