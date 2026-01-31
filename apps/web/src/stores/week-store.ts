'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { WeekConfig, WeekStats } from '@aiplaces/shared';

interface WeekState {
  /** Current week configuration */
  config: WeekConfig | null;

  /** Milliseconds until reset */
  timeUntilReset: number;

  /** Whether a reset is in progress */
  isResetting: boolean;

  /** Whether the week data has been loaded */
  isLoaded: boolean;

  /** Error message if fetch failed */
  error: string | null;

  /** Stats from the most recent reset (shown briefly after reset) */
  lastResetStats: WeekStats | null;

  /** Archive ID from most recent reset */
  lastArchiveId: string | null;

  /** Actions */
  setConfig: (config: WeekConfig) => void;
  setTimeUntilReset: (ms: number) => void;
  tick: () => void;
  setResetting: (isResetting: boolean) => void;
  setError: (error: string | null) => void;
  setLastReset: (archiveId: string, stats: WeekStats) => void;
  clearLastReset: () => void;
  fetchConfig: () => Promise<void>;
}

export const useWeekStore = create<WeekState>()(
  subscribeWithSelector(
    immer((set, get) => ({
        config: null,
        timeUntilReset: 0,
        isResetting: false,
        isLoaded: false,
        error: null,
        lastResetStats: null,
        lastArchiveId: null,

        setConfig: (config) => {
          set((state) => {
            state.config = config;
            state.isLoaded = true;
            state.error = null;

            // Calculate time until reset
            const now = Date.now();
            const resetTime = new Date(config.resetAt).getTime();
            state.timeUntilReset = Math.max(0, resetTime - now);
          });
        },

        setTimeUntilReset: (ms) => {
          set((state) => {
            state.timeUntilReset = Math.max(0, ms);
          });
        },

        tick: () => {
          const { config, timeUntilReset, isResetting } = get();
          if (!config || isResetting) return;

          // Decrease by 1 second
          const newTime = Math.max(0, timeUntilReset - 1000);

          set((state) => {
            state.timeUntilReset = newTime;
          });
        },

        setResetting: (isResetting) => {
          set((state) => {
            state.isResetting = isResetting;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
            state.isLoaded = true;
          });
        },

        setLastReset: (archiveId, stats) => {
          set((state) => {
            state.lastArchiveId = archiveId;
            state.lastResetStats = stats;
            state.isResetting = false;
          });
        },

        clearLastReset: () => {
          set((state) => {
            state.lastArchiveId = null;
            state.lastResetStats = null;
          });
        },

        fetchConfig: async () => {
          try {
            const response = await fetch('/api/week');
            if (!response.ok) {
              throw new Error('Failed to fetch week config');
            }

            const data = await response.json();
            get().setConfig(data.config);
          } catch (error) {
            get().setError(
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        },
    }))
  )
);

/**
 * Format milliseconds to countdown string
 * e.g., "2d 14h 32m 05s" or "32m 05s" if less than an hour
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds.toString().padStart(2, '0')}s`);
  }

  return parts.join(' ');
}

/**
 * Check if reset is imminent (less than 1 hour)
 */
export function isResetUrgent(ms: number): boolean {
  return ms > 0 && ms < 60 * 60 * 1000; // Less than 1 hour
}

/**
 * Check if reset is very imminent (less than 5 minutes)
 */
export function isResetCritical(ms: number): boolean {
  return ms > 0 && ms < 5 * 60 * 1000; // Less than 5 minutes
}
