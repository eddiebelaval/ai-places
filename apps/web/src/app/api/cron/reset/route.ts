/**
 * Weekly Reset Cron Job
 * Runs every Saturday at 9 AM EST (14:00 UTC)
 *
 * Schedule: 0 14 * * 6
 *
 * Steps:
 * 1. Backup canvas from Redis
 * 2. Export to PNG
 * 3. Upload to Supabase Storage
 * 4. Insert canvas_archives record
 * 5. Capture leaderboard snapshot
 * 6. Clear Redis canvas state
 * 7. Clear weekly pixel counters
 * 8. Update week config
 * 9. Broadcast week_reset via pub/sub
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis/client';
import { createClient } from '@supabase/supabase-js';
import {
  REDIS_KEYS,
  CANVAS_DATA_SIZE,
  type WeekConfig,
  createWeekConfig,
} from '@x-place/shared';
import { exportAndUploadCanvas } from '@/lib/services/canvas-export';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout for cron

// Verify cron secret to prevent unauthorized access
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[CRON] Weekly reset started');

  try {
    const redis = getRedis();
    const supabase = getSupabaseAdmin();

    // 1. Get current week config
    const configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);
    const currentConfig: WeekConfig = configStr
      ? JSON.parse(configStr as string)
      : createWeekConfig();

    console.log(
      `[CRON] Archiving week ${currentConfig.weekNumber}/${currentConfig.year}`
    );

    // 2. Backup canvas from Redis
    const canvasBase64 = await redis.get(REDIS_KEYS.CANVAS_STATE);

    const canvasDataStr = typeof canvasBase64 === 'string' ? canvasBase64 : null;

    if (!canvasDataStr) {
      console.log('[CRON] No canvas data found, creating empty archive');
    }

    // Convert base64 to Uint8Array
    const canvasData = canvasDataStr
      ? Uint8Array.from(Buffer.from(canvasDataStr, 'base64'))
      : new Uint8Array(CANVAS_DATA_SIZE);

    // 3. Export to PNG and upload to Supabase Storage
    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    try {
      const urls = await exportAndUploadCanvas(
        canvasData,
        currentConfig.weekNumber,
        currentConfig.year
      );
      imageUrl = urls.imageUrl;
      thumbnailUrl = urls.thumbnailUrl;
      console.log('[CRON] Canvas exported and uploaded');
    } catch (exportError) {
      console.error('[CRON] Failed to export canvas:', exportError);
      // Continue without images - we still want to archive the week
    }

    // 4. Get unique contributors count
    const contributorsCount = await redis.scard(REDIS_KEYS.WEEKLY_CONTRIBUTORS);

    // 5. Get total pixels placed this week (sum from leaderboard)
    const userLeaderboard = await redis.zrange(
      REDIS_KEYS.LEADERBOARD_USERS,
      0,
      -1,
      { withScores: true }
    );

    let totalPixelsPlaced = 0;
    const topContributors: Array<{ userId: string; score: number }> = [];

    for (let i = 0; i < userLeaderboard.length; i += 2) {
      const userId = userLeaderboard[i] as string;
      const score = userLeaderboard[i + 1] as number;
      totalPixelsPlaced += score;
      topContributors.push({ userId, score });
    }

    // Sort by score descending and take top 10
    topContributors.sort((a, b) => b.score - a.score);
    const top10 = topContributors.slice(0, 10);

    // 6. Get faction leaderboard (reversed order - highest first)
    const factionLeaderboard = await redis.zrange(
      REDIS_KEYS.LEADERBOARD_FACTIONS,
      0,
      9,
      { rev: true, withScores: true }
    );

    const topFactions: Array<{ factionId: string; score: number }> = [];
    for (let i = 0; i < factionLeaderboard.length; i += 2) {
      const factionId = factionLeaderboard[i] as string;
      const score = factionLeaderboard[i + 1] as number;
      topFactions.push({ factionId, score });
    }

    // 7. Insert archive record
    const { data: archive, error: archiveError } = await supabase
      .from('canvas_archives')
      .insert({
        week_number: currentConfig.weekNumber,
        year: currentConfig.year,
        started_at: currentConfig.startedAt,
        ended_at: new Date().toISOString(),
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        total_pixels_placed: totalPixelsPlaced,
        unique_contributors: contributorsCount || 0,
        metadata: {
          top_contributors: top10,
          top_factions: topFactions,
        },
      })
      .select()
      .single();

    if (archiveError) {
      console.error('[CRON] Failed to insert archive:', archiveError);
      throw archiveError;
    }

    console.log(`[CRON] Archive created: ${archive.id}`);

    // 8. Save leaderboard snapshots
    await supabase.from('weekly_leaderboard_snapshots').insert([
      {
        archive_id: archive.id,
        leaderboard_type: 'users',
        rankings: top10,
      },
      {
        archive_id: archive.id,
        leaderboard_type: 'factions',
        rankings: topFactions,
      },
    ]);

    // 9. Clear Redis state for new week
    // Backup canvas before clearing
    await redis.set(REDIS_KEYS.CANVAS_BACKUP, canvasDataStr || '');

    // Clear canvas (set to all zeros - color index 0 = white)
    await redis.set(REDIS_KEYS.CANVAS_STATE, '');

    // Clear weekly contributors set
    await redis.del(REDIS_KEYS.WEEKLY_CONTRIBUTORS);

    // Clear user leaderboards (they accumulate per-week)
    await redis.del(REDIS_KEYS.LEADERBOARD_USERS);
    await redis.del(REDIS_KEYS.LEADERBOARD_FACTIONS);

    console.log('[CRON] Redis state cleared');

    // 10. Create new week config
    const newConfig = createWeekConfig();
    await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(newConfig));

    // 11. Move current week comments to archive
    await supabase
      .from('comments')
      .update({
        is_current_week: false,
        archive_id: archive.id,
      })
      .eq('is_current_week', true);

    // 12. Publish reset event via pub/sub
    const resetEvent = {
      type: 'week_reset',
      payload: {
        archiveId: archive.id,
        stats: {
          totalPixelsPlaced,
          uniqueContributors: contributorsCount || 0,
          topContributors: top10,
          topFactions,
        },
        newConfig,
      },
    };

    await redis.publish(REDIS_KEYS.PUBSUB_WEEK, JSON.stringify(resetEvent));

    const duration = Date.now() - startTime;
    console.log(`[CRON] Weekly reset completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      archiveId: archive.id,
      weekNumber: currentConfig.weekNumber,
      year: currentConfig.year,
      stats: {
        totalPixelsPlaced,
        uniqueContributors: contributorsCount || 0,
        imagesUploaded: !!imageUrl,
      },
      duration,
    });
  } catch (error) {
    console.error('[CRON] Weekly reset failed:', error);
    return NextResponse.json(
      {
        error: 'Reset failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET for manual trigger during development
export async function GET(request: NextRequest): Promise<NextResponse> {
  // In production, only allow POST with auth
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Use POST with authorization' },
      { status: 405 }
    );
  }

  // In development, redirect to POST
  return POST(request);
}
