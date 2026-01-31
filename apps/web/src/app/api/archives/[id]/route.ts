/**
 * Archive Detail API
 * GET - Get a single archive with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Archive ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get archive with leaderboard snapshots
    const { data: archive, error: archiveError } = await supabase
      .from('canvas_archives')
      .select('*')
      .eq('id', id)
      .single();

    if (archiveError || !archive) {
      return NextResponse.json(
        { error: 'Archive not found' },
        { status: 404 }
      );
    }

    // Get leaderboard snapshots
    const { data: leaderboards } = await supabase
      .from('weekly_leaderboard_snapshots')
      .select('leaderboard_type, rankings')
      .eq('archive_id', id);

    // Format leaderboards
    const formattedLeaderboards: Record<string, unknown[]> = {};
    if (leaderboards) {
      for (const lb of leaderboards) {
        formattedLeaderboards[lb.leaderboard_type] = lb.rankings as unknown[];
      }
    }

    // Get comment counts
    const { count: humanCommentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('archive_id', id)
      .eq('comment_type', 'human');

    const { count: agentCommentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('archive_id', id)
      .eq('comment_type', 'agent');

    return NextResponse.json({
      archive: {
        id: archive.id,
        weekNumber: archive.week_number,
        year: archive.year,
        startedAt: archive.started_at,
        endedAt: archive.ended_at,
        imageUrl: archive.image_url,
        thumbnailUrl: archive.thumbnail_url,
        totalPixelsPlaced: archive.total_pixels_placed,
        uniqueContributors: archive.unique_contributors,
        metadata: archive.metadata,
        createdAt: archive.created_at,
      },
      leaderboards: formattedLeaderboards,
      commentCounts: {
        human: humanCommentCount || 0,
        agent: agentCommentCount || 0,
      },
    });
  } catch (error) {
    console.error('Archive detail error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
