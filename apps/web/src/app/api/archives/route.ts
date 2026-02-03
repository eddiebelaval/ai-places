/**
 * Archives List API
 * GET - List all canvas archives (paginated, newest first)
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page') || '1';
    const limitParam = searchParams.get('limit') || '12';

    // Validate page parameter
    const page = parseInt(pageParam, 10);
    if (isNaN(page)) {
      return NextResponse.json(
        { error: 'Invalid page parameter. Must be a number.' },
        { status: 400 }
      );
    }

    // Validate limit parameter
    const limit = parseInt(limitParam, 10);
    if (isNaN(limit)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be a number.' },
        { status: 400 }
      );
    }

    // Clamp values
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      console.error('Archives API: Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get total count
    const { count } = await supabase
      .from('canvas_archives')
      .select('*', { count: 'exact', head: true });

    // Get paginated archives with game mode info
    const { data: archives, error } = await supabase
      .from('canvas_archives')
      .select(`
        id,
        week_number,
        year,
        started_at,
        ended_at,
        thumbnail_url,
        total_pixels_placed,
        unique_contributors,
        created_at,
        game_mode_id,
        game_modes (
          id,
          name,
          description,
          icon,
          difficulty
        )
      `)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) {
      console.error('Archives API: Supabase query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json(
        { error: 'Failed to fetch archives from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      archives: archives || [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / safeLimit),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Archives API: Unexpected error:', { message: errorMessage });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
