// @ts-nocheck - Cron route with tables not yet in generated Supabase types
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyCronAuth } from '@/lib/auth/api-auth';
import { getRedis } from '@/lib/redis/client';
import { REDIS_KEYS, CANVAS_DATA_SIZE, createWeekConfig, type WeekConfig } from '@aiplaces/shared';
import { exportAndUploadCanvas } from '@/lib/services/canvas-export';
import { postWeeklyArchiveToX, isXPostingEnabled } from '@/lib/services/x-post';
import {
  getRotationState,
  updateRotationState,
  getCurrentGameMode,
  getNextGameMode,
} from '@/lib/services/rotation-state';
import type { RollbackData } from '@/lib/types/rotation';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

async function rotateGameMode(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  weekNumber: number,
  year: number,
  archiveId: string | null
): Promise<{ previousMode: string; newMode: string; rotationCount: number }> {
  const current = await getCurrentGameMode(supabase);
  const nextModeId = await getNextGameMode(supabase, current.id);
  const now = new Date().toISOString();

  await supabase.from('game_mode_history').upsert(
    { game_mode_id: current.id, week_number: weekNumber, year, archive_id: archiveId, started_at: now, ended_at: now },
    { onConflict: 'week_number,year' }
  );

  const { data } = await supabase
    .from('canvas_state')
    .update({ game_mode_id: nextModeId, activated_at: now, rotation_count: current.rotationCount + 1, updated_at: now })
    .eq('id', 1)
    .select('rotation_count')
    .single();

  return { previousMode: current.id, newMode: nextModeId, rotationCount: data?.rotation_count ?? current.rotationCount + 1 };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[WEEKLY-ROTATE] Starting weekly rotation...');

  const redis = getRedis();
  const supabase = getSupabaseAdmin();

  const currentState = await getRotationState(supabase);
  if (currentState.lastRotationStatus === 'in_progress') {
    const inProgressTime = currentState.lastRotationAt
      ? Date.now() - new Date(currentState.lastRotationAt).getTime()
      : 0;

    if (inProgressTime < 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Rotation already in progress' }, { status: 409 });
    }
  }

  const configRaw = await redis.get(REDIS_KEYS.WEEK_CONFIG);
  let currentConfig: WeekConfig;
  if (!configRaw) {
    currentConfig = createWeekConfig();
  } else if (typeof configRaw === 'string') {
    try {
      currentConfig = JSON.parse(configRaw);
    } catch (parseError) {
      console.error('[WEEKLY-ROTATE] Failed to parse week config, creating new:', parseError);
      currentConfig = createWeekConfig();
    }
  } else {
    currentConfig = configRaw as WeekConfig;
  }
  const currentGameMode = await getCurrentGameMode(supabase);

  const canvasBase64 = await redis.get(REDIS_KEYS.CANVAS_STATE);
  const canvasDataStr = typeof canvasBase64 === 'string' ? canvasBase64 : null;

  const rollbackData: RollbackData = {
    canvasState: canvasDataStr || '',
    weekConfig: currentConfig,
    previousGameMode: currentGameMode.id,
    archiveId: null,
    timestamp: new Date().toISOString(),
  };

  await updateRotationState(supabase, {
    lastRotationAt: new Date().toISOString(),
    lastRotationStatus: 'in_progress',
    lastRotationError: null,
    rollbackData,
  });

  let archiveId: string | null = null;
  let imageUrl: string | null = null;
  let totalPixelsPlaced = 0;
  let contributorsCount = 0;

  try {
    const canvasData = canvasDataStr
      ? Uint8Array.from(Buffer.from(canvasDataStr, 'base64'))
      : new Uint8Array(CANVAS_DATA_SIZE);

    try {
      const urls = await exportAndUploadCanvas(canvasData, currentConfig.weekNumber, currentConfig.year);
      imageUrl = urls.imageUrl;
    } catch (exportError) {
      console.error('[WEEKLY-ROTATE] Failed to export canvas:', exportError);
    }

    contributorsCount = (await redis.scard(REDIS_KEYS.WEEKLY_CONTRIBUTORS)) || 0;

    const userEntries = await parseLeaderboard(redis, REDIS_KEYS.LEADERBOARD_USERS, 'userId');
    totalPixelsPlaced = userEntries.reduce((sum, e) => sum + e.score, 0);
    const top10Users = userEntries.slice(0, 10);

    const topFactions = (await parseLeaderboard(redis, REDIS_KEYS.LEADERBOARD_FACTIONS, 'factionId')).slice(0, 10);
    const topAgents = (await parseLeaderboard(redis, REDIS_KEYS.LEADERBOARD_AGENTS, 'agentId')).slice(0, 10);

    const { data: archive, error: archiveError } = await supabase
      .from('canvas_archives')
      .insert({
        week_number: currentConfig.weekNumber,
        year: currentConfig.year,
        started_at: currentConfig.startedAt,
        ended_at: new Date().toISOString(),
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        total_pixels_placed: totalPixelsPlaced,
        unique_contributors: contributorsCount,
        metadata: { top_contributors: top10Users, top_factions: topFactions, top_agents: topAgents, game_mode: currentGameMode.id },
      })
      .select()
      .single();

    if (archiveError) throw archiveError;

    archiveId = archive.id;
    rollbackData.archiveId = archiveId;

    await supabase.from('weekly_leaderboard_snapshots').insert([
      { archive_id: archiveId, leaderboard_type: 'users', rankings: top10Users },
      { archive_id: archiveId, leaderboard_type: 'factions', rankings: topFactions },
      { archive_id: archiveId, leaderboard_type: 'agents', rankings: topAgents },
    ]);

    const gameModeResult = await rotateGameMode(supabase, currentConfig.weekNumber, currentConfig.year, archiveId);

    await redis.set(REDIS_KEYS.CANVAS_BACKUP, canvasDataStr || '');
    await redis.set(REDIS_KEYS.CANVAS_STATE, '');
    await redis.del(REDIS_KEYS.WEEKLY_CONTRIBUTORS);
    await redis.del(REDIS_KEYS.LEADERBOARD_USERS);
    await redis.del(REDIS_KEYS.LEADERBOARD_FACTIONS);
    await redis.del(REDIS_KEYS.LEADERBOARD_AGENTS);

    const newConfig = createWeekConfig();
    await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(newConfig));

    await supabase.from('comments').update({ is_current_week: false, archive_id: archiveId }).eq('is_current_week', true);

    await redis.publish(REDIS_KEYS.PUBSUB_WEEK, JSON.stringify({
      type: 'week_reset',
      payload: { archiveId, previousGameMode: gameModeResult.previousMode, newGameMode: gameModeResult.newMode, rotationCount: gameModeResult.rotationCount, newConfig },
    }));

    let xPostResult: { success: boolean; postUrl?: string; error?: string } | null = null;
    if (isXPostingEnabled()) {
      try {
        xPostResult = await postWeeklyArchiveToX({
          id: archiveId,
          week_number: currentConfig.weekNumber,
          year: currentConfig.year,
          image_url: imageUrl,
          thumbnail_url: imageUrl,
          total_pixels_placed: totalPixelsPlaced,
          unique_contributors: contributorsCount,
          metadata: { top_contributors: top10Users, top_factions: topFactions },
        });
      } catch (xError) {
        console.error('[WEEKLY-ROTATE] X posting error (non-fatal):', xError);
        xPostResult = { success: false, error: xError instanceof Error ? xError.message : 'Unknown error' };
      }
    }

    await updateRotationState(supabase, {
      lastRotationAt: new Date().toISOString(),
      lastRotationStatus: 'success',
      lastRotationError: null,
      rollbackData,
    });

    const duration = Date.now() - startTime;
    console.log(`[WEEKLY-ROTATE] Rotation completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      archiveId,
      previousMode: gameModeResult.previousMode,
      newMode: gameModeResult.newMode,
      rotationCount: gameModeResult.rotationCount,
      stats: { totalPixelsPlaced, uniqueContributors: contributorsCount, imagesUploaded: !!imageUrl },
      social: { xEnabled: isXPostingEnabled(), xPosted: xPostResult?.success ?? false, xPostUrl: xPostResult?.postUrl ?? null, xError: xPostResult?.error ?? null },
      duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WEEKLY-ROTATE] Rotation failed:', error);

    await updateRotationState(supabase, {
      lastRotationAt: new Date().toISOString(),
      lastRotationStatus: 'failed',
      lastRotationError: errorMessage,
      rollbackData,
    });

    return NextResponse.json({
      success: false,
      archiveId,
      previousMode: currentGameMode.id,
      newMode: currentGameMode.id,
      stats: { totalPixelsPlaced, uniqueContributors: contributorsCount, imagesUploaded: !!imageUrl },
      duration: Date.now() - startTime,
      error: errorMessage,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAdmin();
    const state = await getRotationState(supabase);
    const gameMode = await getCurrentGameMode(supabase);

    const { data: modeDetails } = await supabase.from('game_modes').select('*').eq('id', gameMode.id).single();

    return NextResponse.json({
      currentGameMode: { ...modeDetails, rotationCount: gameMode.rotationCount },
      lastRotation: { at: state.lastRotationAt, status: state.lastRotationStatus, error: state.lastRotationError, hasRollbackData: !!state.rollbackData },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rotation status' }, { status: 500 });
  }
}
