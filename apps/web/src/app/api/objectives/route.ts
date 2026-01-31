/**
 * Weekly Objectives API
 * GET - Get current week's objectives with optional user progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getISOWeekNumber } from '@aiplaces/shared';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId');

    // Optional week/year override (defaults to current)
    const now = new Date();
    const weekParam = searchParams.get('week');
    const yearParam = searchParams.get('year');

    // Validate week parameter (1-53)
    let weekNumber = getISOWeekNumber(now);
    if (weekParam) {
      const parsed = parseInt(weekParam, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 53) {
        return NextResponse.json(
          { error: 'Invalid week parameter. Must be between 1 and 53.' },
          { status: 400 }
        );
      }
      weekNumber = parsed;
    }

    // Validate year parameter (reasonable range)
    let year = now.getFullYear();
    if (yearParam) {
      const parsed = parseInt(yearParam, 10);
      if (isNaN(parsed) || parsed < 2020 || parsed > 2100) {
        return NextResponse.json(
          { error: 'Invalid year parameter. Must be between 2020 and 2100.' },
          { status: 400 }
        );
      }
      year = parsed;
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      console.error('Objectives API: Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get or create weekly objectives using the function
    const { data: objectives, error: objError } = await supabase
      .rpc('get_or_create_weekly_objectives', { p_week: weekNumber, p_year: year });

    if (objError) {
      console.error('Failed to get objectives:', objError);
      // Fall back to just querying existing
      const { data: fallbackObj } = await supabase
        .from('weekly_objectives')
        .select(`
          id,
          objective_id,
          is_primary,
          bonus_multiplier,
          objective_definitions (
            name,
            description,
            icon,
            scoring_type,
            target_value
          )
        `)
        .eq('week_number', weekNumber)
        .eq('year', year)
        .order('is_primary', { ascending: false });

      return NextResponse.json({
        weekNumber,
        year,
        objectives: transformObjectives(fallbackObj || []),
      });
    }

    // Get objective definitions for the objectives
    const objectiveIds = objectives.map((o: { objective_id: string }) => o.objective_id);

    const { data: definitions } = await supabase
      .from('objective_definitions')
      .select('*')
      .in('id', objectiveIds);

    const defMap = new Map((definitions || []).map((d) => [d.id, d]));

    // Get user/agent progress if requested
    let progress: Record<string, { currentValue: number; isCompleted: boolean }> = {};

    if (userId || agentId) {
      const progressQuery = supabase
        .from('objective_progress')
        .select('objective_id, current_value, is_completed')
        .eq('week_number', weekNumber)
        .eq('year', year)
        .in('objective_id', objectiveIds);

      if (userId) {
        progressQuery.eq('user_id', userId);
      } else if (agentId) {
        progressQuery.eq('agent_id', agentId);
      }

      const { data: progressData } = await progressQuery;

      progress = (progressData || []).reduce((acc, p) => {
        acc[p.objective_id] = {
          currentValue: p.current_value,
          isCompleted: p.is_completed,
        };
        return acc;
      }, {} as Record<string, { currentValue: number; isCompleted: boolean }>);
    }

    // Transform response
    const transformedObjectives = objectives.map((obj: {
      id: string;
      objective_id: string;
      is_primary: boolean;
      bonus_multiplier: number;
    }) => {
      const def = defMap.get(obj.objective_id);
      const prog = progress[obj.objective_id];

      return {
        id: obj.id,
        objectiveId: obj.objective_id,
        isPrimary: obj.is_primary,
        bonusMultiplier: obj.bonus_multiplier,
        name: def?.name || 'Unknown',
        description: def?.description || '',
        icon: def?.icon || 'star',
        scoringType: def?.scoring_type || 'pixels',
        targetValue: def?.target_value,
        progress: prog ? {
          currentValue: prog.currentValue,
          isCompleted: prog.isCompleted,
          percentage: def?.target_value
            ? Math.min(100, Math.round((prog.currentValue / def.target_value) * 100))
            : null,
        } : null,
      };
    });

    return NextResponse.json({
      weekNumber,
      year,
      objectives: transformedObjectives,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Objectives API: Unexpected error:', { message: errorMessage });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

function transformObjectives(objectives: unknown[]): unknown[] {
  return (objectives as Array<{
    id: string;
    objective_id: string;
    is_primary: boolean;
    bonus_multiplier: number;
    objective_definitions: {
      name: string;
      description: string;
      icon: string;
      scoring_type: string;
      target_value: number | null;
    };
  }>).map((obj) => ({
    id: obj.id,
    objectiveId: obj.objective_id,
    isPrimary: obj.is_primary,
    bonusMultiplier: obj.bonus_multiplier,
    name: obj.objective_definitions?.name || 'Unknown',
    description: obj.objective_definitions?.description || '',
    icon: obj.objective_definitions?.icon || 'star',
    scoringType: obj.objective_definitions?.scoring_type || 'pixels',
    targetValue: obj.objective_definitions?.target_value,
    progress: null,
  }));
}
