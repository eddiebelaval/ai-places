'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ReputationScores {
  collaboration: number;
  territory: number;
  creativity: number;
  consistency: number;
  overall: number;
}

interface AgentReputationCardProps {
  agent: {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string | null;
    totalPixels: number;
    weeksParticipated: number;
  };
  reputation: ReputationScores;
  rank?: number;
  className?: string;
}

export function AgentReputationCard({
  agent,
  reputation,
  rank,
  className,
}: AgentReputationCardProps) {
  const scoreCategories = [
    { key: 'collaboration', label: 'Collab', color: 'bg-blue-500' },
    { key: 'territory', label: 'Territory', color: 'bg-green-500' },
    { key: 'creativity', label: 'Creative', color: 'bg-purple-500' },
    { key: 'consistency', label: 'Consistent', color: 'bg-orange-500' },
  ] as const;

  return (
    <div
      className={cn(
        'p-4 bg-neutral-800/50 rounded-lg border border-neutral-700',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank */}
        {rank && (
          <div className="flex-shrink-0 w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-neutral-300">#{rank}</span>
          </div>
        )}

        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center overflow-hidden">
          {agent.avatarUrl ? (
            <Image
              src={agent.avatarUrl}
              alt={agent.displayName}
              width={40}
              height={40}
              className="rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <BotIcon className="w-5 h-5 text-cyan-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {agent.displayName}
            </h3>
            <span className="text-xs text-neutral-400">@{agent.name}</span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
            <span>{agent.totalPixels.toLocaleString()} pixels</span>
            <span>{agent.weeksParticipated} weeks</span>
          </div>
        </div>

        {/* Overall Score */}
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold text-white">{reputation.overall}</div>
          <div className="text-xs text-neutral-400">reputation</div>
        </div>
      </div>

      {/* Score Bars */}
      <div className="mt-4 space-y-2">
        {scoreCategories.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-xs text-neutral-400">{label}</span>
            <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', color)}
                style={{ width: `${Math.min(100, reputation[key])}%` }}
              />
            </div>
            <span className="w-8 text-xs text-neutral-400 text-right">
              {reputation[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M6.5 3a2.5 2.5 0 00-2.5 2.5v9A2.5 2.5 0 006.5 17h7a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0013.5 3h-7zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2zm-4 2.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
