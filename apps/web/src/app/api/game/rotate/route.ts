// @ts-nocheck - Route with tables not yet in generated Supabase types
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyServiceAuth } from '@/lib/auth/api-auth';
import { getRedis } from '@/lib/redis/client';
import { REDIS_KEYS } from '@aiplaces/shared';

export const dynamic = 'force-dynamic';

interface CanvasState {
  id: string;
  current_game_mode_id: string | null;
  week_number: number;
  year: number;
  started_at: string;
  reset_at: string;
  next_game_mode_id: string | null;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getNextResetTime(from: Date = new Date()): Date {
  const reset = new Date(from);
  reset.setUTCHours(14, 0, 0, 0);

  const dayOfWeek = reset.getUTCDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;

  if (dayOfWeek === 6 && from.getTime() < reset.getTime()) {
    return reset;
  }

  reset.setUTCDate(reset.getUTCDate() + daysUntilSaturday);
  return reset;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyServiceAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const redis = getRedis();

    if (!redis) {
      return NextResponse.json({ error: 'Redis service unavailable' }, { status: 503 });
    }

    const { data: canvas, error: canvasError } = await supabase
      .from('canvas_state')
      .select('*')
      .single();

    if (canvasError || !canvas) {
      return NextResponse.json({ error: 'Failed to fetch current canvas state' }, { status: 500 });
    }

    const currentCanvas = canvas as unknown as CanvasState;

    let canvasBackup: string | null = null;
    try {
      canvasBackup = await redis.get(REDIS_KEYS.CANVAS_STATE);
    } catch (redisError) {
      console.error('Game Rotate API: Failed to backup canvas from Redis:', redisError);
    }

    const { data: archive, error: archiveError } = await supabase
      .from('canvas_archives')
      .insert({
        week_number: currentCanvas.week_number,
        year: currentCanvas.year,
        started_at: currentCanvas.started_at,
        ended_at: new Date().toISOString(),
        game_mode_id: currentCanvas.current_game_mode_id,
        total_pixels_placed: 0,
        unique_contributors: 0,
        metadata: {
          rotated_at: new Date().toISOString(),
          canvas_backup: canvasBackup ? 'stored' : 'unavailable',
        },
      })
      .select()
      .single();

    if (archiveError) {
      return NextResponse.json({ error: 'Failed to create canvas archive' }, { status: 500 });
    }

    let nextGameModeId = currentCanvas.next_game_mode_id;

    if (!nextGameModeId) {
      const { data: randomMode } = await supabase
        .from('game_modes')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (randomMode && randomMode.length > 0) {
        const randomIndex = Math.floor(Math.random() * randomMode.length);
        nextGameModeId = randomMode[randomIndex].id;
      } else {
        nextGameModeId = 'classic';
      }
    }

    const now = new Date();
    const newWeekNumber = getISOWeekNumber(now);
    const newYear = now.getFullYear();
    const newResetAt = getNextResetTime(now);

    const { error: updateError } = await supabase
      .from('canvas_state')
      .update({
        current_game_mode_id: nextGameModeId,
        week_number: newWeekNumber,
        year: newYear,
        started_at: now.toISOString(),
        reset_at: newResetAt.toISOString(),
        next_game_mode_id: null,
        announce_next_at: null,
      })
      .eq('id', currentCanvas.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update canvas state' }, { status: 500 });
    }

    try {
      await redis.del(REDIS_KEYS.CANVAS_STATE);
    } catch (redisError) {
      console.error('Game Rotate API: Failed to clear Redis canvas:', redisError);
    }

    return NextResponse.json({
      success: true,
      summary: {
        previousWeek: {
          weekNumber: currentCanvas.week_number,
          year: currentCanvas.year,
          gameModeId: currentCanvas.current_game_mode_id,
          archivedId: archive.id,
        },
        newWeek: {
          weekNumber: newWeekNumber,
          year: newYear,
          gameModeId: nextGameModeId,
          startedAt: now.toISOString(),
          resetAt: newResetAt.toISOString(),
        },
      },
      rotatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Game Rotate API: Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
