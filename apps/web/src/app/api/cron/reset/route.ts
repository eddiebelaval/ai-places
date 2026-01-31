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
} from '@aiplaces/shared';
import { exportAndUploadCanvas } from '@/lib/services/canvas-export';
import { postWeeklyArchiveToX, isXPostingEnabled } from '@/lib/services/x-post';
import { sendWeeklyNewsletter, type NewsletterData } from '@/lib/email/newsletter';

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

    // 6.5. Get agent leaderboard
    const agentLeaderboard = await redis.zrange(
      REDIS_KEYS.LEADERBOARD_AGENTS,
      0,
      9,
      { rev: true, withScores: true }
    );

    const topAgents: Array<{ agentId: string; score: number }> = [];
    for (let i = 0; i < agentLeaderboard.length; i += 2) {
      const agentId = agentLeaderboard[i] as string;
      const score = agentLeaderboard[i + 1] as number;
      topAgents.push({ agentId, score });
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
          top_agents: topAgents,
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
      {
        archive_id: archive.id,
        leaderboard_type: 'agents',
        rankings: topAgents,
      },
    ]);

    // 8.5. Post to X (Twitter) - don't fail reset if this fails
    let xPostResult: { success: boolean; postUrl?: string; error?: string } | null = null;
    if (isXPostingEnabled()) {
      try {
        console.log('[CRON] Posting weekly archive to X...');
        xPostResult = await postWeeklyArchiveToX({
          id: archive.id,
          week_number: currentConfig.weekNumber,
          year: currentConfig.year,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          total_pixels_placed: totalPixelsPlaced,
          unique_contributors: contributorsCount || 0,
          metadata: {
            top_contributors: top10,
            top_factions: topFactions,
          },
        });
        if (xPostResult.success) {
          console.log(`[CRON] Posted to X: ${xPostResult.postUrl}`);
        } else {
          console.warn(`[CRON] X posting failed: ${xPostResult.error}`);
        }
      } catch (xError) {
        console.error('[CRON] X posting error (non-fatal):', xError);
        xPostResult = {
          success: false,
          error: xError instanceof Error ? xError.message : 'Unknown X posting error',
        };
      }
    } else {
      console.log('[CRON] X posting is disabled');
    }

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
    await redis.del(REDIS_KEYS.LEADERBOARD_AGENTS);

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
          topAgents,
        },
        newConfig,
      },
    };

    await redis.publish(REDIS_KEYS.PUBSUB_WEEK, JSON.stringify(resetEvent));

    // 13. Send weekly newsletter to premium subscribers - don't fail reset if this fails
    let newsletterResult: { success: boolean; sent: number; failed: number; errors: string[] } | null = null;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aiplaces.art';

    try {
      console.log('[CRON] Sending weekly newsletter...');
      const newsletterData: NewsletterData = {
        archiveId: archive.id,
        weekNumber: currentConfig.weekNumber,
        year: currentConfig.year,
        imageUrl: imageUrl || '',
        stats: {
          totalPixels: totalPixelsPlaced,
          contributors: contributorsCount || 0,
        },
        topContributors: top10,
        galleryUrl: `${APP_URL}/gallery/${archive.id}`,
      };

      newsletterResult = await sendWeeklyNewsletter(newsletterData);

      if (newsletterResult.success) {
        console.log(`[CRON] Newsletter sent to ${newsletterResult.sent} subscribers`);
      } else {
        console.warn(`[CRON] Newsletter partially failed: ${newsletterResult.sent} sent, ${newsletterResult.failed} failed`);
      }
    } catch (newsletterError) {
      console.error('[CRON] Newsletter error (non-fatal):', newsletterError);
      newsletterResult = {
        success: false,
        sent: 0,
        failed: 0,
        errors: [newsletterError instanceof Error ? newsletterError.message : 'Unknown newsletter error'],
      };
    }

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
      social: {
        xEnabled: isXPostingEnabled(),
        xPosted: xPostResult?.success ?? false,
        xPostUrl: xPostResult?.postUrl ?? null,
        xError: xPostResult?.error ?? null,
      },
      newsletter: {
        sent: newsletterResult?.sent ?? 0,
        failed: newsletterResult?.failed ?? 0,
        success: newsletterResult?.success ?? false,
        errors: newsletterResult?.errors ?? [],
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

// NOTE: GET handler removed for security reasons.
// Manual testing should use POST with proper Authorization header:
// curl -X POST http://localhost:3000/api/cron/reset -H "Authorization: Bearer $CRON_SECRET"
