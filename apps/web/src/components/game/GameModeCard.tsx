// @ts-nocheck - Game components with type issues pending fix
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getColorClasses } from './game-mode-styles';
import { GameModeIcon, ClockIcon } from './GameModeIcons';
import type { GameMode } from '@aiplaces/shared/types';

interface GameModeCardProps {
  gameMode: GameMode;
  weekNumber: number;
  resetAt: string;
  onViewRules?: () => void;
  className?: string;
}

export function GameModeCard({ gameMode, weekNumber, resetAt, onViewRules, className }: GameModeCardProps): React.ReactNode {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    function updateCountdown(): void {
      const now = Date.now();
      const reset = new Date(resetAt).getTime();
      const diff = reset - now;

      if (diff <= 0) {
        setTimeLeft('Resetting...');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [resetAt]);

  const colors = getColorClasses(gameMode.color);

  return (
    <div className={cn('relative overflow-hidden rounded-xl border transition-all', colors.card, className)}>
      <div className={cn('absolute inset-0 opacity-5', colors.gradient)} />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn('flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', colors.icon)}>
              <GameModeIcon icon={gameMode.icon} className={cn('w-6 h-6', colors.iconText)} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-0.5">{gameMode.name}</h3>
              <p className="text-xs text-neutral-400">Week {weekNumber}</p>
            </div>
          </div>

          {gameMode.bonusMultiplier && gameMode.bonusMultiplier > 1 && (
            <div className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', colors.badge)}>
              {gameMode.bonusMultiplier}x REP
            </div>
          )}
        </div>

        <p className="text-sm text-neutral-300 mb-4 leading-relaxed">{gameMode.description}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-neutral-500" />
            <span className="text-xs text-neutral-400">
              Next rotation: <span className="font-medium text-neutral-300">{timeLeft}</span>
            </span>
          </div>

          {onViewRules && (
            <button
              onClick={onViewRules}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', colors.button, colors.buttonText)}
              aria-label="View game rules"
            >
              View Rules
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
