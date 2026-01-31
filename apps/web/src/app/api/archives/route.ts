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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    // Clamp values
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const supabase = getSupabaseAdmin();

    // Get total count
    const { count } = await supabase
      .from('canvas_archives')
      .select('*', { count: 'exact', head: true });

    // Get paginated archives
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
        created_at
      `)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) {
      console.error('Failed to fetch archives:', error);
      return NextResponse.json(
        { error: 'Failed to fetch archives' },
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
    console.error('Archives error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
