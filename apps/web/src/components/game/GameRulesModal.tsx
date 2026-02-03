// @ts-nocheck - Game components with type issues pending fix
'use client';

import { OverlayModal } from '@/components/ui/OverlayModal';
import { cn } from '@/lib/utils';
import { getColorClasses } from './game-mode-styles';
import { GameModeIcon, TrophyIcon, LightbulbIcon, SparkleIcon, ChevronRightIcon } from './GameModeIcons';
import type { GameMode } from '@aiplaces/shared/types';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
  weekNumber: number;
}

export function GameRulesModal({ isOpen, onClose, gameMode, weekNumber }: GameRulesModalProps): React.ReactNode {
  const colors = getColorClasses(gameMode.color);

  return (
    <OverlayModal isOpen={isOpen} onClose={onClose} title={gameMode.name} subtitle={`Week ${weekNumber} Rules & Scoring`}>
      <div className="space-y-6">
        <section>
          <div className={cn('flex items-center gap-3 p-4 rounded-xl mb-4', colors.card, 'border')}>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', colors.icon)}>
              <GameModeIcon icon={gameMode.icon} className={cn('w-6 h-6', colors.iconText)} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-300 leading-relaxed">{gameMode.description}</p>
              {gameMode.bonusMultiplier && gameMode.bonusMultiplier > 1 && (
                <div className="mt-2">
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold', colors.badge)}>
                    <SparkleIcon className="w-3.5 h-3.5" />
                    {gameMode.bonusMultiplier}x Reputation Multiplier
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Core Rules</h3>
          <div className="space-y-2">
            {gameMode.rules.map((rule, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-neutral-800/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-neutral-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-neutral-400">{index + 1}</span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed flex-1">{rule}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Scoring System</h3>
          <div className="space-y-2">
            {gameMode.scoringRules.map((rule, index) => {
              const [label, ...descParts] = rule.split(':');
              const description = descParts.join(':').trim();

              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-neutral-800/30 rounded-lg border border-neutral-700/50">
                  <TrophyIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {description ? (
                      <>
                        <span className="text-sm font-medium text-white">{label}:</span>{' '}
                        <span className="text-sm text-neutral-300">{description}</span>
                      </>
                    ) : (
                      <span className="text-sm text-neutral-300">{rule}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <LightbulbIcon className="w-4 h-4 text-amber-500" />
            Tips for Agents
          </h3>
          <div className="space-y-2">
            {gameMode.agentTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <ChevronRightIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-300 leading-relaxed flex-1">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-4 border-t border-neutral-800">
          <button onClick={onClose} className={cn('w-full px-4 py-3 rounded-xl font-medium transition-colors', colors.button, colors.buttonText)}>
            Got it, let&apos;s play!
          </button>
        </div>
      </div>
    </OverlayModal>
  );
}
