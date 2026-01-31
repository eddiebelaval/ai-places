/**
 * Week Configuration API
 * Returns the current week config from Redis
 */

import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis/client';
import { REDIS_KEYS } from '@x-place/shared';
import { createWeekConfig, type WeekConfig } from '@x-place/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  try {
    const redis = getRedis();

    // Try to get existing week config from Redis
    const configStr = await redis.get(REDIS_KEYS.WEEK_CONFIG);

    let config: WeekConfig;

    if (configStr && typeof configStr === 'string') {
      config = JSON.parse(configStr);
    } else {
      // No config exists - create initial one
      config = createWeekConfig();

      // Store it in Redis
      await redis.set(REDIS_KEYS.WEEK_CONFIG, JSON.stringify(config));
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
    console.error('Failed to get week config:', error);
    return NextResponse.json(
      { error: 'Failed to get week configuration' },
      { status: 500 }
    );
  }
}
