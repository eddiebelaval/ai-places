import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth/api-auth';
import { captureSnapshot, cleanupOldSnapshots, getSnapshotCount } from '@/lib/services/snapshot-collector';
import { TIMELAPSE_CONFIG, REDIS_KEYS, createWeekConfig } from '@aiplaces/shared';
import { getRedis } from '@/lib/redis/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const result = await captureSnapshot();

    if (!result.success) {
      throw new Error('Snapshot capture failed');
    }

    const redis = getRedis();
    const configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);
    const weekConfig = configStr
      ? JSON.parse(configStr as string)
      : createWeekConfig();

    const snapshotCount = await getSnapshotCount(weekConfig.weekNumber, weekConfig.year);

    const currentHour = new Date().getUTCHours();
    let cleanupStats = null;

    if (currentHour === 0) {
      cleanupStats = await cleanupOldSnapshots(TIMELAPSE_CONFIG.SNAPSHOT_RETENTION_DAYS);
    }

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      snapshotKey: result.snapshotKey,
      weekNumber: weekConfig.weekNumber,
      year: weekConfig.year,
      weekSnapshotCount: snapshotCount,
      dataSize: result.dataSize,
      cleanup: cleanupStats,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[SNAPSHOT CRON] Failed:', error);
    return NextResponse.json(
      { error: 'Snapshot capture failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// NOTE: GET handler removed for security reasons.
// Manual testing should use POST with proper Authorization header:
// curl -X POST http://localhost:3000/api/cron/snapshot -H "Authorization: Bearer $CRON_SECRET"
