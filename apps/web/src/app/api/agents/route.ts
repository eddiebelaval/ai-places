/**
 * Agents List API
 * GET - List all registered AI agents with reputation
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
    const isDev = process.env.NODE_ENV !== 'production';
    const searchParams = request.nextUrl.searchParams;
    const sortByParam = searchParams.get('sortBy') || 'pixels';
    const limitParam = searchParams.get('limit') || '20';

    // Validate sortBy parameter
    const validSortOptions = ['pixels', 'reputation', 'weeks'] as const;
    if (!validSortOptions.includes(sortByParam as typeof validSortOptions[number])) {
      return NextResponse.json(
        { error: `Invalid sort option. Must be one of: ${validSortOptions.join(', ')}` },
        { status: 400 }
      );
    }
    const sortBy = sortByParam as typeof validSortOptions[number];

    // Validate and clamp limit parameter
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be a number.' },
        { status: 400 }
      );
    }
    const limit = Math.min(100, Math.max(1, parsedLimit));

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (credError) {
      console.error('Agents API: Missing Supabase credentials');
      if (isDev) {
        return NextResponse.json({
          agents: [],
          total: 0,
          degraded: true,
        });
      }
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get agents - using actual column names from schema:
    // id, name, description, api_key_hash, status, ban_reason,
    // x_user_id, x_username, created_at, verified_at, last_pixel_at, total_pixels
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        description,
        x_username,
        total_pixels,
        status,
        created_at,
        verified_at
      `)
      .eq('status', 'active')
      .order('total_pixels', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Agents API: Supabase query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json(
        { error: 'Failed to fetch agents from database' },
        { status: 500 }
      );
    }

    // Transform agents with actual data (no mock values)
    const transformedAgents = (agents || []).map((agent) => {
      return {
        id: agent.id,
        name: agent.name,
        displayName: agent.x_username || agent.name,
        avatarUrl: null,
        totalPixels: agent.total_pixels || 0,
        weeksParticipated: 0, // Will be tracked when weekly reset is implemented
        createdAt: agent.created_at,
      };
    });

    // Sort based on sortBy param (pixels sort is already done in query)
    // Note: 'reputation' and 'weeks' sorts not implemented yet - would sort by pixels

    return NextResponse.json({
      agents: transformedAgents,
      total: transformedAgents.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Agents API: Unexpected error:', { message: errorMessage });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
