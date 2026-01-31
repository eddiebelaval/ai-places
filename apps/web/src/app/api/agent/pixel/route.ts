/**
 * Agent Pixel Placement API
 * POST - Place a pixel on the canvas (API key auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getRedis } from '@/lib/redis/client';
import {
  REDIS_KEYS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_COUNT,
} from '@aiplaces/shared';

export const dynamic = 'force-dynamic';

/** Agent cooldown in milliseconds (30 seconds) */
const AGENT_COOLDOWN_MS = 30000;

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
    // 1. Validate API key
    const apiKey = request.headers.get('x-agent-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      console.error('Pixel API: Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Find agent by hashed API key
    // Using actual schema columns: id, name, status (not display_name, is_active)
    const hashedKey = hashApiKey(apiKey);
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('api_key_hash', hashedKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'Agent is disabled' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { x, y, color } = body;

    // Validate coordinates
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      x >= CANVAS_WIDTH ||
      y < 0 ||
      y >= CANVAS_HEIGHT
    ) {
      return NextResponse.json(
        { error: `Invalid coordinates. x and y must be integers from 0-${CANVAS_WIDTH - 1}` },
        { status: 400 }
      );
    }

    // Validate color
    if (
      typeof color !== 'number' ||
      !Number.isInteger(color) ||
      color < 0 ||
      color >= COLOR_COUNT
    ) {
      return NextResponse.json(
        { error: `Invalid color. Must be integer from 0-${COLOR_COUNT - 1}` },
        { status: 400 }
      );
    }

    // 3. Check cooldown
    const redis = getRedis();
    if (!redis) {
      console.error('Pixel API: Redis client not available');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    let cooldownValue: string | null = null;
    const cooldownKey = REDIS_KEYS.COOLDOWN_AGENT(agent.id);
    try {
      cooldownValue = await redis.get(cooldownKey);
    } catch (redisError) {
      console.error('Pixel API: Redis cooldown check failed:', redisError);
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    if (cooldownValue) {
      // Get TTL to report remaining cooldown
      let remainingMs = AGENT_COOLDOWN_MS;
      try {
        const ttl = await redis.pttl(cooldownKey);
        remainingMs = ttl > 0 ? ttl : AGENT_COOLDOWN_MS;
      } catch {
        // Use default cooldown if TTL check fails
      }

      return NextResponse.json(
        {
          error: 'Cooldown active',
          remainingMs,
        },
        { status: 429 }
      );
    }

    // 4. Update canvas using SETBIT operations
    // Each pixel uses 4 bits for 16 colors (0-15)
    // We set 4 individual bits to represent the color
    const pixelIndex = y * CANVAS_WIDTH + x;
    const bitOffset = pixelIndex * 4; // 4 bits per pixel
    try {
      // Set 4 bits individually using SETBIT
      // Bit order: MSB first (bit 0 of color goes to highest bit position)
      const bit3 = ((color >> 3) & 1) as 0 | 1;
      const bit2 = ((color >> 2) & 1) as 0 | 1;
      const bit1 = ((color >> 1) & 1) as 0 | 1;
      const bit0 = ((color >> 0) & 1) as 0 | 1;
      await Promise.all([
        redis.setbit(REDIS_KEYS.CANVAS_STATE, bitOffset + 0, bit3),
        redis.setbit(REDIS_KEYS.CANVAS_STATE, bitOffset + 1, bit2),
        redis.setbit(REDIS_KEYS.CANVAS_STATE, bitOffset + 2, bit1),
        redis.setbit(REDIS_KEYS.CANVAS_STATE, bitOffset + 3, bit0),
      ]);

      console.log(`Pixel API: Set pixel at (${x},${y}) to color ${color}`);
    } catch (canvasError: unknown) {
      // Log full error details server-side for debugging
      console.error('Pixel API: Failed to update canvas:', canvasError);
      // Return generic error to client - never expose internal error details (CWE-209)
      return NextResponse.json(
        { error: 'Failed to place pixel on canvas' },
        { status: 500 }
      );
    }

    // 5. Set cooldown (non-critical - continue on failure)
    try {
      await redis.set(cooldownKey, Date.now().toString(), {
        px: AGENT_COOLDOWN_MS,
      });
    } catch (cooldownSetError) {
      console.warn('Pixel API: Failed to set cooldown:', cooldownSetError);
      // Continue - pixel was placed successfully
    }

    // 6. Update stats (non-critical - continue on failures)
    try {
      // Increment agent leaderboard
      await redis.zincrby(REDIS_KEYS.LEADERBOARD_AGENTS, 1, agent.id);

      // Increment agent's weekly pixel count
      await redis.incr(REDIS_KEYS.WEEKLY_PIXELS_AGENT(agent.id));

      // Add agent to weekly contributors set (with agent: prefix to distinguish)
      await redis.sadd(REDIS_KEYS.WEEKLY_CONTRIBUTORS, `agent:${agent.id}`);
    } catch (statsError) {
      console.warn('Pixel API: Failed to update stats:', statsError);
      // Continue - pixel was placed successfully
    }

    console.log(
      `Agent pixel placed by ${agent.name} at (${x}, ${y}) color ${color}`
    );

    return NextResponse.json({
      success: true,
      cooldownMs: AGENT_COOLDOWN_MS,
      pixel: {
        x,
        y,
        color,
      },
      agent: {
        id: agent.id,
        name: agent.name,
      },
    });
  } catch (error) {
    console.error('Agent pixel placement error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
