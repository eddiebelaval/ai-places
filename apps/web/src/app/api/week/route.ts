/**
 * Week Configuration API
 * Returns the current week config from Redis
 */

import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis/client';
import { REDIS_KEYS } from '@aiplaces/shared';
import { createWeekConfig, type WeekConfig } from '@aiplaces/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  try {
    const redis = getRedis();

    if (!redis) {
      console.error('Week API: Redis client not available');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Try to get existing week config from Redis with error handling
    let configStr: string | null = null;
    try {
      configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);
    } catch (redisError) {
      console.error('Week API: Redis GET error:', redisError);
      // Fall through to create default config
    }

    let config: WeekConfig;

    if (configStr && typeof configStr === 'string') {
      try {
        config = JSON.parse(configStr);
      } catch (parseError) {
        console.error('Week API: Failed to parse config from Redis, creating new:', parseError);
        config = createWeekConfig();
      }
    } else {
      // No config exists - create initial one
      config = createWeekConfig();

      // Store it in Redis (non-blocking)
      try {
        await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(config));
      } catch (setError) {
        console.warn('Week API: Failed to cache week config:', setError);
        // Continue - not critical
      }
    }

    // Calculate time until reset
    const now = Date.now();
    const resetTime = new Date(config.resetAt).getTime();
    const timeUntilReset = Math.max(0, resetTime - now);

    return NextResponse.json({
      config,
      timeUntilReset,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Week API error:', { message: errorMessage });
    return NextResponse.json(
      { error: 'Failed to get week configuration' },
      { status: 500 }
    );
  }
}
