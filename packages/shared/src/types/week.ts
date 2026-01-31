/**
 * Week configuration and reset types for X-Place V2
 */

export interface WeekConfig {
  /** ISO week number (1-53) */
  weekNumber: number;
  /** Year (e.g., 2026) */
  year: number;
  /** When this week started (ISO string) */
  startedAt: string;
  /** When this week resets - next Saturday 9 AM EST (ISO string) */
  resetAt: string;
  /** Canvas version at week start */
  initialVersion: number;
}

export interface WeekResetResult {
  /** Archive ID created from the reset */
  archiveId: string;
  /** Stats from the completed week */
  stats: WeekStats;
  /** New week configuration */
  newConfig: WeekConfig;
}

export interface WeekStats {
  /** Total pixels placed during the week */
  totalPixelsPlaced: number;
  /** Number of unique contributors */
  uniqueContributors: number;
  /** Top contributors (user IDs) */
  topContributors: Array<{
    userId: string;
    username: string;
    pixelsPlaced: number;
  }>;
  /** Top factions */
  topFactions: Array<{
    factionId: string;
    name: string;
    territoryCount: number;
  }>;
}

export interface CanvasArchive {
  id: string;
  weekNumber: number;
  year: number;
  startedAt: string;
  endedAt: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  totalPixelsPlaced: number;
  uniqueContributors: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Calculate the next Saturday 9 AM EST reset time
 */
export function getNextResetTime(from: Date = new Date()): Date {
  const reset = new Date(from);

  // Set to 9 AM EST (14:00 UTC)
  reset.setUTCHours(14, 0, 0, 0);

  // Find next Saturday
  const dayOfWeek = reset.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;

  // If it's Saturday but before 9 AM EST, reset is today
  if (dayOfWeek === 6 && from.getTime() < reset.getTime()) {
    return reset;
  }

  reset.setUTCDate(reset.getUTCDate() + daysUntilSaturday);
  return reset;
}

/**
 * Get ISO week number from a date
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Create a week config for the current week
 */
export function createWeekConfig(startedAt: Date = new Date()): WeekConfig {
  return {
    weekNumber: getISOWeekNumber(startedAt),
    year: startedAt.getFullYear(),
    startedAt: startedAt.toISOString(),
    resetAt: getNextResetTime(startedAt).toISOString(),
    initialVersion: 0,
  };
}
