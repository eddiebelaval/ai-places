// @ts-nocheck - Admin route with tables not yet in generated Supabase types
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/auth/api-auth';
import { getRedis } from '@/lib/redis/client';
import { REDIS_KEYS, CANVAS_DATA_SIZE, createWeekConfig, type WeekConfig } from '@aiplaces/shared';
import { exportAndUploadCanvas } from '@/lib/services/canvas-export';
import {
  getRotationState,
  updateRotationState,
  getCurrentGameMode,
  getNextGameMode,
} from '@/lib/services/rotation-state';
import type { RollbackData } from '@/lib/types/rotation';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function performManualRotation(options: { dryRun?: boolean; forceMode?: string }): Promise<{
  success: boolean;
  archiveId: string | null;
  previousMode: string;
  newMode: string;
  stats: Record<string, unknown>;
  error?: string;
}> {
  const { dryRun = false, forceMode } = options;

  const redis = getRedis();
  const supabase = getSupabaseAdmin();

  const configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);
  const currentConfig: WeekConfig = configStr ? JSON.parse(configStr as string) : createWeekConfig();
  const currentGameMode = await getCurrentGameMode(supabase);
  const nextModeId = forceMode || await getNextGameMode(supabase, currentGameMode.id);

  if (dryRun) {
    return {
      success: true,
      archiveId: null,
      previousMode: currentGameMode.id,
      newMode: nextModeId,
      stats: { dryRun: true, weekNumber: currentConfig.weekNumber, year: currentConfig.year, wouldRotateTo: nextModeId },
    };
  }

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

  try {
    const canvasData = canvasDataStr
      ? Uint8Array.from(Buffer.from(canvasDataStr, 'base64'))
      : new Uint8Array(CANVAS_DATA_SIZE);

    let imageUrl: string | null = null;
    try {
      const urls = await exportAndUploadCanvas(canvasData, currentConfig.weekNumber, currentConfig.year);
      imageUrl = urls.imageUrl;
    } catch (exportError) {
      console.error('[ADMIN-ROTATE] Failed to export canvas:', exportError);
    }

    const contributorsCount = (await redis.scard(REDIS_KEYS.WEEKLY_CONTRIBUTORS)) || 0;

    const userLeaderboard = await redis.zrange(REDIS_KEYS.LEADERBOARD_USERS, 0, -1, { withScores: true });
    let totalPixelsPlaced = 0;
    const topContributors: Array<{ userId: string; score: number }> = [];

    for (let i = 0; i < userLeaderboard.length; i += 2) {
      const userId = userLeaderboard[i] as string;
      const score = userLeaderboard[i + 1] as number;
      totalPixelsPlaced += score;
      topContributors.push({ userId, score });
    }
    topContributors.sort((a, b) => b.score - a.score);

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
        metadata: { top_contributors: topContributors.slice(0, 10), game_mode: currentGameMode.id, manual_rotation: true },
      })
      .select()
      .single();

    if (archiveError) throw archiveError;

    archiveId = archive.id;
    rollbackData.archiveId = archiveId;

    const now = new Date().toISOString();
    await supabase.from('game_mode_history').upsert(
      { game_mode_id: currentGameMode.id, week_number: currentConfig.weekNumber, year: currentConfig.year, archive_id: archiveId, started_at: now, ended_at: now },
      { onConflict: 'week_number,year' }
    );

    await supabase.from('canvas_state').update({ game_mode_id: nextModeId, activated_at: now, rotation_count: currentGameMode.rotationCount + 1, updated_at: now }).eq('id', 1);

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
      payload: { archiveId, previousGameMode: currentGameMode.id, newGameMode: nextModeId, manualRotation: true },
    }));

    await updateRotationState(supabase, {
      lastRotationAt: new Date().toISOString(),
      lastRotationStatus: 'success',
      lastRotationError: null,
      rollbackData,
    });

    return {
      success: true,
      archiveId,
      previousMode: currentGameMode.id,
      newMode: nextModeId,
      stats: { totalPixelsPlaced, uniqueContributors: contributorsCount, imagesUploaded: !!imageUrl },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateRotationState(supabase, {
      lastRotationAt: new Date().toISOString(),
      lastRotationStatus: 'failed',
      lastRotationError: errorMessage,
      rollbackData,
    });

    return { success: false, archiveId, previousMode: currentGameMode.id, newMode: currentGameMode.id, stats: {}, error: errorMessage };
  }
}

async function performRollback(): Promise<{ success: boolean; message: string }> {
  const redis = getRedis();
  const supabase = getSupabaseAdmin();

  const state = await getRotationState(supabase);
  if (!state.rollbackData) {
    return { success: false, message: 'No rollback data available' };
  }

  const { canvasState, weekConfig, previousGameMode, archiveId } = state.rollbackData;

  try {
    if (canvasState) await redis.set(REDIS_KEYS.CANVAS_STATE, canvasState);
    await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(weekConfig));
    await supabase.from('canvas_state').update({ game_mode_id: previousGameMode, updated_at: new Date().toISOString() }).eq('id', 1);

    if (archiveId) {
      await supabase.from('canvas_archives').delete().eq('id', archiveId);
      await supabase.from('weekly_leaderboard_snapshots').delete().eq('archive_id', archiveId);
      await supabase.from('comments').update({ is_current_week: true, archive_id: null }).eq('archive_id', archiveId);
    }

    await redis.publish(REDIS_KEYS.PUBSUB_WEEK, JSON.stringify({ type: 'rotation_rollback', payload: { restoredGameMode: previousGameMode, timestamp: new Date().toISOString() } }));

    await updateRotationState(supabase, { lastRotationAt: new Date().toISOString(), lastRotationStatus: 'rolled_back', lastRotationError: null, rollbackData: null });

    return { success: true, message: 'Rollback completed successfully' };
  } catch (error) {
    return { success: false, message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function forceGameMode(modeId: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseAdmin();
  const redis = getRedis();

  const { data: mode, error: modeError } = await supabase.from('game_modes').select('id, name').eq('id', modeId).single();
  if (modeError || !mode) {
    return { success: false, message: `Game mode '${modeId}' not found` };
  }

  const { error: updateError } = await supabase.from('canvas_state').update({ game_mode_id: modeId, updated_at: new Date().toISOString() }).eq('id', 1);
  if (updateError) {
    return { success: false, message: `Failed to update game mode: ${updateError.message}` };
  }

  await redis.publish(REDIS_KEYS.PUBSUB_WEEK, JSON.stringify({ type: 'game_mode_change', payload: { newGameMode: modeId, modeName: mode.name, forced: true, timestamp: new Date().toISOString() } }));

  return { success: true, message: `Game mode set to '${mode.name}'` };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const action = new URL(request.url).searchParams.get('action');

  try {
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch {}

    switch (action) {
      case 'rollback': {
        const result = await performRollback();
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
      case 'force-mode': {
        const modeId = body.modeId as string;
        if (!modeId) return NextResponse.json({ error: 'modeId required' }, { status: 400 });
        const result = await forceGameMode(modeId);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }
      case 'set-week': {
        const weekNumber = body.weekNumber as number;
        if (typeof weekNumber !== 'number' || weekNumber < 1) {
          return NextResponse.json({ error: 'weekNumber must be a positive integer' }, { status: 400 });
        }
        const supabase = getSupabaseAdmin();
        const redis = getRedis();
        // Update Supabase canvas_state (table has single row with id=1)
        const { error: dbError } = await supabase
          .from('canvas_state')
          .update({ week_number: weekNumber, updated_at: new Date().toISOString() })
          .eq('id', 1);
        if (dbError) {
          return NextResponse.json({ error: `DB update failed: ${dbError.message}` }, { status: 500 });
        }
        // Update Redis week config
        try {
          const configRaw = await redis.get(REDIS_KEYS.WEEK_CONFIG);
          let config: WeekConfig;

          if (configRaw) {
            // Handle both string and object responses from Redis
            if (typeof configRaw === 'string') {
              config = JSON.parse(configRaw);
            } else if (typeof configRaw === 'object') {
              config = configRaw as WeekConfig;
            } else {
              config = createWeekConfig(weekNumber);
            }
            config.weekNumber = weekNumber;
          } else {
            // Create new config if none exists
            config = createWeekConfig(weekNumber);
          }

          await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(config));
        } catch (redisError) {
          console.warn('Failed to update Redis week config:', redisError);
          // Continue - Supabase was updated successfully
        }
        return NextResponse.json({ success: true, weekNumber, message: `Week number set to ${weekNumber}` });
      }
      default: {
        const result = await performManualRotation({ dryRun: body.dryRun as boolean ?? false, forceMode: body.forceMode as string });
        return NextResponse.json(result, { status: result.success ? 200 : 500 });
      }
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = verifyAdminAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const state = await getRotationState(supabase);
    const gameMode = await getCurrentGameMode(supabase);

    const { data: modeDetails } = await supabase.from('game_modes').select('*').eq('id', gameMode.id).single();
    const { data: allModes } = await supabase.from('game_modes').select('id, name, description, is_active').order('id');
    const { data: history } = await supabase.from('game_mode_history').select('*').order('year', { ascending: false }).order('week_number', { ascending: false }).limit(10);

    return NextResponse.json({
      currentGameMode: { ...modeDetails, rotationCount: gameMode.rotationCount },
      rotationState: { lastRotationAt: state.lastRotationAt, lastRotationStatus: state.lastRotationStatus, lastRotationError: state.lastRotationError, hasRollbackData: !!state.rollbackData, rollbackTimestamp: state.rollbackData?.timestamp },
      availableModes: allModes,
      recentHistory: history,
      actions: { rotate: 'POST /api/admin/rotate', rotateWithOptions: 'POST /api/admin/rotate { dryRun?: boolean, forceMode?: string }', rollback: 'POST /api/admin/rotate?action=rollback', forceMode: 'POST /api/admin/rotate?action=force-mode { modeId: string }' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch admin status' }, { status: 500 });
  }
}
