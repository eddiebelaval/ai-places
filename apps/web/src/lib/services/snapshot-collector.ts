/**
 * Snapshot Collector Service
 * Captures hourly canvas snapshots for timelapse generation
 *
 * Snapshots are stored in Redis with:
 * - Individual snapshot keys: xplace:snapshot:{timestamp}
 * - Weekly index (sorted set): xplace:snapshot:index:{year}:{weekNumber}
 *   Score = timestamp, Value = snapshot key
 */

import { getRedis } from '@/lib/redis/client';
import {
  REDIS_KEYS,
  TIMELAPSE_CONFIG,
  type WeekConfig,
  createWeekConfig,
} from '@aiplaces/shared';

export interface SnapshotMetadata {
  timestamp: string;
  weekNumber: number;
  year: number;
  pixelCount: number;
}

export interface CaptureResult {
  success: boolean;
  timestamp: string;
  snapshotKey: string;
  indexKey: string;
  dataSize: number;
}

/**
 * Capture a snapshot of the current canvas state
 * Stores the canvas data with a timestamp key and adds to weekly index
 */
export async function captureSnapshot(): Promise<CaptureResult> {
  const redis = getRedis();
  const now = new Date();
  const timestamp = now.toISOString();

  // Get current week config to determine week number
  const configRaw = await redis.get(REDIS_KEYS.WEEK_CONFIG);
  let weekConfig: WeekConfig;
  if (!configRaw) {
    weekConfig = createWeekConfig();
  } else if (typeof configRaw === 'string') {
    try {
      weekConfig = JSON.parse(configRaw);
    } catch {
      weekConfig = createWeekConfig();
    }
  } else {
    weekConfig = configRaw as WeekConfig;
  }

  // Read current canvas state
  const canvasBase64 = await redis.get(REDIS_KEYS.CANVAS_STATE);
  const canvasDataStr = typeof canvasBase64 === 'string' ? canvasBase64 : '';

  // Store snapshot with timestamp key
  const snapshotKey = REDIS_KEYS.SNAPSHOT(timestamp);
  const indexKey = REDIS_KEYS.SNAPSHOT_INDEX(weekConfig.weekNumber, weekConfig.year);

  // Create snapshot data with metadata
  const snapshotData = JSON.stringify({
    timestamp,
    weekNumber: weekConfig.weekNumber,
    year: weekConfig.year,
    canvasData: canvasDataStr,
  });

  // Store snapshot
  await redis.set(snapshotKey, snapshotData);

  // Set TTL based on retention period
  const ttlSeconds = TIMELAPSE_CONFIG.SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60;
  await redis.expire(snapshotKey, ttlSeconds);

  // Add to weekly index sorted set (score = unix timestamp for ordering)
  const unixTimestamp = Math.floor(now.getTime() / 1000);
  await redis.zadd(indexKey, { score: unixTimestamp, member: snapshotKey });

  // Also set TTL on index (extends with each addition, cleaned up with snapshots)
  await redis.expire(indexKey, ttlSeconds);

  console.log(
    `[SNAPSHOT] Captured snapshot at ${timestamp} for week ${weekConfig.weekNumber}/${weekConfig.year}`
  );

  return {
    success: true,
    timestamp,
    snapshotKey,
    indexKey,
    dataSize: canvasDataStr.length,
  };
}

/**
 * Get all snapshots for a specific week
 * Returns snapshots in chronological order
 */
export async function getSnapshotsForWeek(
  weekNumber: number,
  year: number
): Promise<Array<{ key: string; timestamp: number; data: string | null }>> {
  const redis = getRedis();
  const indexKey = REDIS_KEYS.SNAPSHOT_INDEX(weekNumber, year);

  // Get all snapshot keys from index, ordered by timestamp
  const snapshotEntries = await redis.zrange(indexKey, 0, -1, { withScores: true });

  if (!snapshotEntries || snapshotEntries.length === 0) {
    return [];
  }

  // Parse the entries (alternating key/score pairs)
  const snapshots: Array<{ key: string; timestamp: number; data: string | null }> = [];

  for (let i = 0; i < snapshotEntries.length; i += 2) {
    const key = snapshotEntries[i] as string;
    const timestamp = snapshotEntries[i + 1] as number;

    // Fetch the actual snapshot data
    const snapshotStr = await redis.get(key);

    if (snapshotStr && typeof snapshotStr === 'string') {
      try {
        const snapshot = JSON.parse(snapshotStr);
        snapshots.push({
          key,
          timestamp,
          data: snapshot.canvasData,
        });
      } catch {
        // Skip malformed snapshots
        console.warn(`[SNAPSHOT] Skipping malformed snapshot: ${key}`);
      }
    }
  }

  return snapshots;
}

/**
 * Get snapshot keys for a week (without fetching data)
 * Useful for counting or batch operations
 */
export async function getSnapshotKeysForWeek(
  weekNumber: number,
  year: number
): Promise<string[]> {
  const redis = getRedis();
  const indexKey = REDIS_KEYS.SNAPSHOT_INDEX(weekNumber, year);

  const entries = await redis.zrange(indexKey, 0, -1);
  return entries as string[];
}

/**
 * Get the count of snapshots for a week
 */
export async function getSnapshotCount(
  weekNumber: number,
  year: number
): Promise<number> {
  const redis = getRedis();
  const indexKey = REDIS_KEYS.SNAPSHOT_INDEX(weekNumber, year);
  return await redis.zcard(indexKey);
}

/**
 * Clean up snapshots older than specified days
 * Note: Individual snapshots have TTL set, but this provides manual cleanup
 */
export async function cleanupOldSnapshots(days: number): Promise<{
  deletedCount: number;
  indexesScanned: number;
}> {
  const redis = getRedis();
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  let deletedCount = 0;
  let indexesScanned = 0;

  // Get current week config for reference
  const configRaw = await redis.get(REDIS_KEYS.WEEK_CONFIG);
  let weekConfig: WeekConfig;
  if (!configRaw) {
    weekConfig = createWeekConfig();
  } else if (typeof configRaw === 'string') {
    try {
      weekConfig = JSON.parse(configRaw);
    } catch {
      weekConfig = createWeekConfig();
    }
  } else {
    weekConfig = configRaw as WeekConfig;
  }

  // Calculate the range of weeks to scan (current week and previous weeks within retention)
  const weeksToScan = Math.ceil(days / 7) + 1;

  for (let i = 0; i < weeksToScan; i++) {
    let weekNumber = weekConfig.weekNumber - i;
    let year = weekConfig.year;

    // Handle year rollover
    if (weekNumber < 1) {
      weekNumber = 52 + weekNumber;
      year = year - 1;
    }

    const indexKey = REDIS_KEYS.SNAPSHOT_INDEX(weekNumber, year);
    indexesScanned++;

    // Get old snapshot keys (score < cutoff timestamp)
    // Using zrange with byScore option for Upstash Redis compatibility
    const oldSnapshots = await redis.zrange(indexKey, 0, cutoffTimestamp, { byScore: true });

    if (oldSnapshots && oldSnapshots.length > 0) {
      // Delete the snapshot data
      for (const snapshotKey of oldSnapshots) {
        await redis.del(snapshotKey as string);
        deletedCount++;
      }

      // Remove from index
      await redis.zremrangebyscore(indexKey, 0, cutoffTimestamp);
    }
  }

  console.log(
    `[SNAPSHOT] Cleanup complete: deleted ${deletedCount} snapshots, scanned ${indexesScanned} indexes`
  );

  return { deletedCount, indexesScanned };
}

/**
 * Get latest snapshot for a week
 */
export async function getLatestSnapshot(
  weekNumber: number,
  year: number
): Promise<{ key: string; timestamp: number; data: string } | null> {
  const redis = getRedis();
  const indexKey = REDIS_KEYS.SNAPSHOT_INDEX(weekNumber, year);

  // Get the last entry (highest score = most recent)
  const entries = await redis.zrange(indexKey, -1, -1, { withScores: true });

  if (!entries || entries.length < 2) {
    return null;
  }

  const key = entries[0] as string;
  const timestamp = entries[1] as number;

  const snapshotStr = await redis.get(key);
  if (!snapshotStr || typeof snapshotStr !== 'string') {
    return null;
  }

  try {
    const snapshot = JSON.parse(snapshotStr);
    return {
      key,
      timestamp,
      data: snapshot.canvasData,
    };
  } catch {
    return null;
  }
}
