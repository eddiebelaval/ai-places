// @ts-nocheck - Route with tables not yet in generated Supabase types
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rules: Record<string, unknown>;
  difficulty: string | null;
}

interface CanvasState {
  id: string;
  current_game_mode_id: string | null;
  week_number: number;
  year: number;
  started_at: string;
  reset_at: string;
  next_game_mode_id: string | null;
  announce_next_at: string | null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: canvas, error: canvasError } = await supabase
      .from('canvas_state')
      .select('*')
      .single();

    if (canvasError || !canvas) {
      console.error('Game Current API: Failed to fetch canvas state:', canvasError);
      return NextResponse.json({ error: 'Failed to fetch current game state' }, { status: 500 });
    }

    const canvasState = canvas as unknown as CanvasState;

    let currentGameMode: GameMode | null = null;
    if (canvasState.current_game_mode_id) {
      const { data: mode, error: modeError } = await supabase
        .from('game_modes')
        .select('id, name, description, icon, rules, difficulty')
        .eq('id', canvasState.current_game_mode_id)
        .single();

      if (!modeError && mode) {
        currentGameMode = mode as GameMode;
      }
    }

    const now = Date.now();
    const resetTime = new Date(canvasState.reset_at).getTime();
    const timeUntilReset = Math.max(0, resetTime - now);

    let timeUntilAnnouncement: number | null = null;
    if (canvasState.announce_next_at) {
      const announceTime = new Date(canvasState.announce_next_at).getTime();
      if (announceTime > now) {
        timeUntilAnnouncement = announceTime - now;
      }
    }

    return NextResponse.json({
      currentMode: currentGameMode,
      week: {
        weekNumber: canvasState.week_number,
        year: canvasState.year,
        startedAt: canvasState.started_at,
        resetAt: canvasState.reset_at,
      },
      timeUntilReset,
      timeUntilAnnouncement,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Game Current API: Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
