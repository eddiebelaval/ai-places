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

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: canvas, error: canvasError } = await supabase
      .from('canvas_state')
      .select('next_game_mode_id, announce_next_at, reset_at')
      .single();

    if (canvasError || !canvas) {
      console.error('Game Upcoming API: Failed to fetch canvas state:', canvasError);
      return NextResponse.json({ error: 'Failed to fetch upcoming game state' }, { status: 500 });
    }

    const now = Date.now();
    const shouldAnnounce = canvas.announce_next_at
      ? new Date(canvas.announce_next_at).getTime() <= now
      : false;

    if (!canvas.next_game_mode_id || !shouldAnnounce) {
      return NextResponse.json({
        upcomingMode: null,
        announced: false,
        message: "Next week's game mode will be announced soon",
      });
    }

    const { data: mode, error: modeError } = await supabase
      .from('game_modes')
      .select('id, name, description, icon, rules, difficulty')
      .eq('id', canvas.next_game_mode_id)
      .single();

    if (modeError) {
      console.error('Game Upcoming API: Failed to fetch game mode:', modeError);
      return NextResponse.json({ error: 'Failed to fetch upcoming game mode' }, { status: 500 });
    }

    return NextResponse.json({
      upcomingMode: mode as GameMode,
      announced: true,
      startsAt: canvas.reset_at,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Game Upcoming API: Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
