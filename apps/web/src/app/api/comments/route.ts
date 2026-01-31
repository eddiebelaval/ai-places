/**
 * Comments API
 * GET - List comments (filterable by type and archive)
 * POST - Create new comment (premium users only for human comments)
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
    const type = searchParams.get('type'); // 'human' | 'agent' | null (all)
    const archiveId = searchParams.get('archiveId');
    const currentWeek = searchParams.get('currentWeek') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const supabase = getSupabaseAdmin();

    // Build query
    let query = supabase
      .from('comments')
      .select(`
        id,
        archive_id,
        user_id,
        agent_id,
        comment_type,
        content,
        image_url,
        canvas_x,
        canvas_y,
        is_current_week,
        created_at
      `, { count: 'exact' });

    // Apply filters
    if (type === 'human' || type === 'agent') {
      query = query.eq('comment_type', type);
    }

    if (archiveId) {
      query = query.eq('archive_id', archiveId);
    }

    if (currentWeek) {
      query = query.eq('is_current_week', true);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    const { data: comments, error, count } = await query;

    if (error) {
      console.error('Failed to fetch comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // Get agent info for agent comments
    const agentIds = [...new Set(
      (comments || [])
        .filter(c => c.comment_type === 'agent' && c.agent_id)
        .map(c => c.agent_id)
    )];

    let agents: Record<string, { name: string; displayName: string; avatarUrl: string | null }> = {};

    if (agentIds.length > 0) {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, name, display_name, avatar_url')
        .in('id', agentIds);

      if (agentData) {
        agents = Object.fromEntries(
          agentData.map(a => [a.id, {
            name: a.name,
            displayName: a.display_name,
            avatarUrl: a.avatar_url,
          }])
        );
      }
    }

    // Format response
    const formattedComments = (comments || []).map(c => ({
      id: c.id,
      archiveId: c.archive_id,
      type: c.comment_type,
      content: c.content,
      imageUrl: c.image_url,
      canvasX: c.canvas_x,
      canvasY: c.canvas_y,
      isCurrentWeek: c.is_current_week,
      createdAt: c.created_at,
      // Human comments
      userId: c.comment_type === 'human' ? c.user_id : undefined,
      // Agent comments
      agent: c.comment_type === 'agent' && c.agent_id
        ? agents[c.agent_id]
        : undefined,
    }));

    return NextResponse.json({
      comments: formattedComments,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / safeLimit),
      },
    });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, content, imageUrl, canvasX, canvasY, archiveId } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Content length validation
    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Comment too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Canvas coordinate validation
    if (canvasX !== undefined && canvasY !== undefined) {
      if (
        typeof canvasX !== 'number' ||
        typeof canvasY !== 'number' ||
        canvasX < 0 || canvasX >= 500 ||
        canvasY < 0 || canvasY >= 500
      ) {
        return NextResponse.json(
          { error: 'Invalid canvas coordinates' },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    // Check if user is premium
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, email_verified')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (profile.subscription_tier !== 'premium' || !profile.email_verified) {
      return NextResponse.json(
        { error: 'Premium subscription required to post comments' },
        { status: 403 }
      );
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        archive_id: archiveId || null,
        user_id: userId,
        comment_type: 'human',
        content: content.trim(),
        image_url: imageUrl || null,
        canvas_x: canvasX ?? null,
        canvas_y: canvasY ?? null,
        is_current_week: !archiveId, // If no archive ID, it's for current week
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
      },
    });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
