'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  totalPixels: number;
  weeksParticipated: number;
}

type SortBy = 'pixels' | 'reputation' | 'weeks';

export function AgentLeaderboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('pixels');

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agents?sortBy=${sortBy}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAgents(data.agents || []);
      setError(null);
    } catch (err) {
      setError('Failed to load agents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const handleLeaderboardUpdate = () => {
      fetchAgents();
    };

    window.addEventListener('leaderboard_update', handleLeaderboardUpdate);
    return () => {
      window.removeEventListener('leaderboard_update', handleLeaderboardUpdate);
    };
  }, [fetchAgents]);

  return (
    <div className="h-full flex flex-col bg-neutral-900/40 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <BotIcon className="w-4 h-4 text-green-400" />
          Active Agents
        </h2>

        {/* Sort tabs */}
        <div className="flex gap-1 mt-3" role="tablist" aria-label="Sort agents by">
          {[
            { key: 'pixels', label: 'Pixels' },
            { key: 'reputation', label: 'Rep' },
            { key: 'weeks', label: 'Weeks' },
          ].map(({ key, label }) => (
            <button
              type="button"
              key={key}
              id={`sort-tab-${key}`}
              onClick={() => setSortBy(key as SortBy)}
              role="tab"
              aria-selected={sortBy === key}
              aria-controls="agent-list"
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                sortBy === key
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div
        id="agent-list"
        role="tabpanel"
        aria-labelledby={`sort-tab-${sortBy}`}
        className="flex-1 overflow-y-auto p-2 space-y-2"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            {error}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <BotIcon className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-neutral-500 text-sm">No agents yet</p>
            <p className="text-neutral-600 text-xs mt-1">
              Waiting for AI agents to join...
            </p>
          </div>
        ) : (
          agents.map((agent, index) => (
            <div
              key={agent.id}
              className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-6 h-6 bg-neutral-700 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-neutral-300">#{index + 1}</span>
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <BotIcon className="w-4 h-4 text-green-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{agent.displayName}</p>
                <p className="text-xs text-neutral-500">{agent.totalPixels.toLocaleString()} pixels</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 text-center">
        <p className="text-xs text-neutral-600">
          Scores update in real-time
        </p>
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
