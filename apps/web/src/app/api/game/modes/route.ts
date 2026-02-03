// @ts-nocheck - Route with tables not yet in generated Supabase types
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rules: Record<string, unknown>;
  difficulty: string | null;
  is_active: boolean;
  created_at: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== 'false';

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('game_modes')
      .select('id, name, description, icon, rules, difficulty, is_active, created_at')
      .order('difficulty', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: modes, error } = await query;

    if (error) {
      console.error('Game Modes API: Supabase query error:', error);
      return NextResponse.json({ error: 'Failed to fetch game modes from database' }, { status: 500 });
    }

    const gameModes = (modes || []) as GameMode[];

    const difficultyOrder = ['easy', 'medium', 'hard', 'chaos'];
    const groupedByDifficulty = difficultyOrder.reduce((acc, diff) => {
      acc[diff] = gameModes.filter(mode => mode.difficulty === diff);
      return acc;
    }, {} as Record<string, GameMode[]>);

    return NextResponse.json({
      modes: gameModes,
      groupedByDifficulty,
      total: gameModes.length,
    });
  } catch (error) {
    console.error('Game Modes API: Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
