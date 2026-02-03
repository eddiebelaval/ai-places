// @ts-nocheck - Game components with type issues pending fix
'use client';

import { cn } from '@/lib/utils';
import { getColorClasses } from './game-mode-styles';
import { GameModeIcon, ChevronRightIcon, CalendarIcon, RotateIcon } from './GameModeIcons';
import type { GameMode } from '@aiplaces/shared/types';

interface WeeklyScheduleProps {
  currentWeek: {
    weekNumber: number;
    gameMode: GameMode;
    resetAt: string;
  };
  nextWeek: {
    weekNumber: number;
    gameMode: GameMode;
  };
  onViewCurrentRules?: () => void;
  className?: string;
}

export function WeeklySchedule({ currentWeek, nextWeek, onViewCurrentRules, className }: WeeklyScheduleProps): React.ReactNode {
  const currentColors = getColorClasses(currentWeek.gameMode.color);
  const nextColors = getColorClasses(nextWeek.gameMode.color);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Game Schedule</h3>
        <CalendarIcon className="w-4 h-4 text-neutral-500" />
      </div>

      <div className={cn('relative overflow-hidden rounded-xl border-2 transition-all', currentColors.card)}>
        <div className="absolute top-2 right-2">
          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', currentColors.badge)}>
            Active Now
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', currentColors.icon)}>
              <GameModeIcon icon={currentWeek.gameMode.icon} className={cn('w-5 h-5', currentColors.iconText)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <h4 className="text-base font-bold text-white">{currentWeek.gameMode.name}</h4>
                <span className="text-xs text-neutral-500">Week {currentWeek.weekNumber}</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed mb-3">{currentWeek.gameMode.description}</p>

              {onViewCurrentRules && (
                <button onClick={onViewCurrentRules} className={cn('text-xs font-medium transition-colors flex items-center gap-1', currentColors.link)}>
                  View full rules
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Next Week</span>
          <div className="flex-1 h-px bg-neutral-700" />
        </div>

        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', nextColors.iconMuted)}>
            <GameModeIcon icon={nextWeek.gameMode.icon} className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h5 className="text-sm font-semibold text-neutral-300">{nextWeek.gameMode.name}</h5>
              <span className="text-xs text-neutral-600">Week {nextWeek.weekNumber}</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">{nextWeek.gameMode.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/30 rounded-lg border border-neutral-700/30">
        <RotateIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        <p className="text-xs text-neutral-400">Game modes rotate weekly on Saturdays at 9 AM EST</p>
      </div>
    </div>
  );
}
