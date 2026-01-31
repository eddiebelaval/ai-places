/**
 * Snapshot Capture Cron Job
 * Runs every hour to capture canvas snapshots for timelapse
 *
 * Schedule: 0 * * * * (every hour at minute 0)
 *
 * Steps:
 * 1. Verify cron authentication
 * 2. Capture current canvas state
 * 3. Store snapshot with timestamp key
 * 4. Add to weekly index
 * 5. Optionally cleanup old snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  captureSnapshot,
  cleanupOldSnapshots,
  getSnapshotCount,
} from '@/lib/services/snapshot-collector';
import { TIMELAPSE_CONFIG, REDIS_KEYS, createWeekConfig } from '@aiplaces/shared';
import { getRedis } from '@/lib/redis/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 second timeout for cron

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('[SNAPSHOT CRON] CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[SNAPSHOT CRON] Snapshot capture started');

  try {
    // 1. Capture the snapshot
    const result = await captureSnapshot();

    if (!result.success) {
      throw new Error('Snapshot capture failed');
    }

    // 2. Get current week info for stats
    const redis = getRedis();
    const configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);
    const weekConfig = configStr
      ? JSON.parse(configStr as string)
      : createWeekConfig();

    // 3. Get snapshot count for this week
    const snapshotCount = await getSnapshotCount(
      weekConfig.weekNumber,
      weekConfig.year
    );

    // 4. Run cleanup every 24 hours (check if hour is 0)
    const currentHour = new Date().getUTCHours();
    let cleanupStats = null;

    if (currentHour === 0) {
      console.log('[SNAPSHOT CRON] Running daily cleanup');
      cleanupStats = await cleanupOldSnapshots(
        TIMELAPSE_CONFIG.SNAPSHOT_RETENTION_DAYS
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[SNAPSHOT CRON] Snapshot captured in ${duration}ms`);

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      snapshotKey: result.snapshotKey,
      weekNumber: weekConfig.weekNumber,
      year: weekConfig.year,
      weekSnapshotCount: snapshotCount,
      dataSize: result.dataSize,
      cleanup: cleanupStats,
      duration,
    });
  } catch (error) {
    console.error('[SNAPSHOT CRON] Snapshot capture failed:', error);
    return NextResponse.json(
      {
        error: 'Snapshot capture failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// NOTE: GET handler removed for security reasons.
// Manual testing should use POST with proper Authorization header:
// curl -X POST http://localhost:3000/api/cron/snapshot -H "Authorization: Bearer $CRON_SECRET"
