// @ts-nocheck - Cron route with tables not yet in generated Supabase types
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyCronAuth } from '@/lib/auth/api-auth';
import { getRedis } from '@/lib/redis/client';
import { REDIS_KEYS, CANVAS_DATA_SIZE, createWeekConfig, type WeekConfig } from '@aiplaces/shared';
import { exportAndUploadCanvas } from '@/lib/services/canvas-export';
import { postWeeklyArchiveToX, isXPostingEnabled } from '@/lib/services/x-post';
import { sendWeeklyNewsletter, type NewsletterData } from '@/lib/email/newsletter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface LeaderboardEntry {
  userId?: string;
  agentId?: string;
  factionId?: string;
  score: number;
}

async function parseLeaderboard(redis: ReturnType<typeof getRedis>, key: string, idField: string): Promise<LeaderboardEntry[]> {
  const data = await redis.zrange(key, 0, -1, { withScores: true });
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < data.length; i += 2) {
    entries.push({ [idField]: data[i] as string, score: data[i + 1] as number });
  }

  return entries.sort((a, b) => b.score - a.score);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[CRON] Weekly reset started');

  try {
    const redis = getRedis();
    const supabase = getSupabaseAdmin();

    const configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);
    const currentConfig: WeekConfig = configStr
      ? JSON.parse(configStr as string)
      : createWeekConfig();

    console.log(`[CRON] Archiving week ${currentConfig.weekNumber}/${currentConfig.year}`);

    const canvasBase64 = await redis.get(REDIS_KEYS.CANVAS_STATE);
    const canvasDataStr = typeof canvasBase64 === 'string' ? canvasBase64 : null;

    const canvasData = canvasDataStr
      ? Uint8Array.from(Buffer.from(canvasDataStr, 'base64'))
      : new Uint8Array(CANVAS_DATA_SIZE);

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    try {
      const urls = await exportAndUploadCanvas(canvasData, currentConfig.weekNumber, currentConfig.year);
      imageUrl = urls.imageUrl;
      thumbnailUrl = urls.thumbnailUrl;
      console.log('[CRON] Canvas exported and uploaded');
    } catch (exportError) {
      console.error('[CRON] Failed to export canvas:', exportError);
    }

    const contributorsCount = await redis.scard(REDIS_KEYS.WEEKLY_CONTRIBUTORS);

    const userEntries = await parseLeaderboard(redis, REDIS_KEYS.LEADERBOARD_USERS, 'userId');
    const totalPixelsPlaced = userEntries.reduce((sum, e) => sum + e.score, 0);
    const top10Users = userEntries.slice(0, 10);

    const factionEntries = await parseLeaderboard(redis, REDIS_KEYS.LEADERBOARD_FACTIONS, 'factionId');
    const topFactions = factionEntries.slice(0, 10);

    const agentEntries = await parseLeaderboard(redis, REDIS_KEYS.LEADERBOARD_AGENTS, 'agentId');
    const topAgents = agentEntries.slice(0, 10);

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
        metadata: { top_contributors: top10Users, top_factions: topFactions, top_agents: topAgents },
      })
      .select()
      .single();

    if (archiveError) {
      console.error('[CRON] Failed to insert archive:', archiveError);
      throw archiveError;
    }

    console.log(`[CRON] Archive created: ${archive.id}`);

    await supabase.from('weekly_leaderboard_snapshots').insert([
      { archive_id: archive.id, leaderboard_type: 'users', rankings: top10Users },
      { archive_id: archive.id, leaderboard_type: 'factions', rankings: topFactions },
      { archive_id: archive.id, leaderboard_type: 'agents', rankings: topAgents },
    ]);

    let xPostResult: { success: boolean; postUrl?: string; error?: string } | null = null;
    if (isXPostingEnabled()) {
      try {
        xPostResult = await postWeeklyArchiveToX({
          id: archive.id,
          week_number: currentConfig.weekNumber,
          year: currentConfig.year,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          total_pixels_placed: totalPixelsPlaced,
          unique_contributors: contributorsCount || 0,
          metadata: { top_contributors: top10Users, top_factions: topFactions },
        });
      } catch (xError) {
        console.error('[CRON] X posting error (non-fatal):', xError);
        xPostResult = { success: false, error: xError instanceof Error ? xError.message : 'Unknown error' };
      }
    }

    await redis.set(REDIS_KEYS.CANVAS_BACKUP, canvasDataStr || '');
    await redis.set(REDIS_KEYS.CANVAS_STATE, '');
    await redis.del(REDIS_KEYS.WEEKLY_CONTRIBUTORS);
    await redis.del(REDIS_KEYS.LEADERBOARD_USERS);
    await redis.del(REDIS_KEYS.LEADERBOARD_FACTIONS);
    await redis.del(REDIS_KEYS.LEADERBOARD_AGENTS);

    const newConfig = createWeekConfig();
    await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(newConfig));

    await supabase
      .from('comments')
      .update({ is_current_week: false, archive_id: archive.id })
      .eq('is_current_week', true);

    await redis.publish(REDIS_KEYS.PUBSUB_WEEK, JSON.stringify({
      type: 'week_reset',
      payload: {
        archiveId: archive.id,
        stats: { totalPixelsPlaced, uniqueContributors: contributorsCount || 0, topContributors: top10Users, topFactions, topAgents },
        newConfig,
      },
    }));

    let newsletterResult: { success: boolean; sent: number; failed: number; errors: string[] } | null = null;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aiplaces.art';

    try {
      const newsletterData: NewsletterData = {
        archiveId: archive.id,
        weekNumber: currentConfig.weekNumber,
        year: currentConfig.year,
        imageUrl: imageUrl || '',
        stats: { totalPixels: totalPixelsPlaced, contributors: contributorsCount || 0 },
        topContributors: top10Users,
        galleryUrl: `${APP_URL}/gallery/${archive.id}`,
      };
      newsletterResult = await sendWeeklyNewsletter(newsletterData);
    } catch (newsletterError) {
      console.error('[CRON] Newsletter error (non-fatal):', newsletterError);
      newsletterResult = { success: false, sent: 0, failed: 0, errors: [newsletterError instanceof Error ? newsletterError.message : 'Unknown error'] };
    }

    const duration = Date.now() - startTime;
    console.log(`[CRON] Weekly reset completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      archiveId: archive.id,
      weekNumber: currentConfig.weekNumber,
      year: currentConfig.year,
      stats: { totalPixelsPlaced, uniqueContributors: contributorsCount || 0, imagesUploaded: !!imageUrl },
      social: { xEnabled: isXPostingEnabled(), xPosted: xPostResult?.success ?? false, xPostUrl: xPostResult?.postUrl ?? null, xError: xPostResult?.error ?? null },
      newsletter: { sent: newsletterResult?.sent ?? 0, failed: newsletterResult?.failed ?? 0, success: newsletterResult?.success ?? false, errors: newsletterResult?.errors ?? [] },
      duration,
    });
  } catch (error) {
    console.error('[CRON] Weekly reset failed:', error);
    return NextResponse.json(
      { error: 'Reset failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// NOTE: GET handler removed for security reasons.
// Manual testing should use POST with proper Authorization header:
// curl -X POST http://localhost:3000/api/cron/reset -H "Authorization: Bearer $CRON_SECRET"
