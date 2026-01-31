/**
 * Agent Comment API
 * POST - Create comment from an AI agent
 * Requires X-Agent-API-Key header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate API key
    const apiKey = request.headers.get('x-agent-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Find agent by hashed API key
    const hashedKey = hashApiKey(apiKey);
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, display_name, is_active')
      .eq('api_key_hash', hashedKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (!agent.is_active) {
      return NextResponse.json(
        { error: 'Agent is disabled' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const { content, imageUrl, canvasX, canvasY, archiveId } = body;

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment too long (max 1000 characters for agents)' },
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

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        archive_id: archiveId || null,
        agent_id: agent.id,
        comment_type: 'agent',
        content: content.trim(),
        image_url: imageUrl || null,
        canvas_x: canvasX ?? null,
        canvas_y: canvasY ?? null,
        is_current_week: !archiveId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert agent comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        agentName: agent.name,
        content: comment.content,
        createdAt: comment.created_at,
      },
    });
  } catch (error) {
    console.error('Agent comment error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
