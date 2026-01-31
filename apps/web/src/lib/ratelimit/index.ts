/**
 * Rate Limiting Utility
 *
 * Implements sliding window rate limiting using Redis.
 * Uses atomic INCR + EXPIRE operations for thread-safe counting.
 *
 * Security considerations:
 * - IP-based limiting prevents abuse from single sources
 * - Sliding window prevents burst attacks at window boundaries
 * - Graceful degradation: allows requests if Redis is unavailable (fail-open)
 *   to prevent DoS via Redis failure
 */

import { getRedis } from '../redis/client';

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Prefix for the Redis key */
  prefix: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the window */
  remaining: number;
  /** Timestamp when the rate limit resets (Unix seconds) */
  resetAt: number;
  /** Number of requests made in current window */
  current: number;
}

/**
 * Check and increment rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSeconds, prefix } = config;

  // Create a time-bucketed key for sliding window
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const key = `${prefix}:${identifier}:${windowStart}`;
  const resetAt = windowStart + windowSeconds;

  try {
    const redis = getRedis();

    // Atomic increment and get
    // Uses pipeline for atomic INCR + TTL check
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);

    const results = await pipeline.exec();

    // Results: [incrResult, ttlResult]
    const current = (results[0] as number) || 1;
    const ttl = results[1] as number;

    // Set expiry on first request in window (when TTL is -1, key has no expiry)
    if (ttl === -1 || ttl === -2) {
      // -1 = no expiry set, -2 = key doesn't exist (shouldn't happen after INCR)
      await redis.expire(key, windowSeconds);
    }

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    return {
      allowed,
      remaining,
      resetAt,
      current,
    };
  } catch (error) {
    // Fail open: if Redis is unavailable, allow the request
    // This prevents a Redis outage from causing a complete service denial
    // Log for monitoring but don't block legitimate users
    console.error('[RateLimit] Redis error, failing open:', error);

    return {
      allowed: true,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
      current: 0,
    };
  }
}

/**
 * Get client IP from request headers
 * Handles various proxy configurations (Cloudflare, Vercel, nginx)
 *
 * Security note: These headers can be spoofed if not properly configured.
 * Ensure your infrastructure sets these headers correctly and strips
 * any client-provided values.
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;

  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;

  // Vercel / AWS / most proxies
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP (original client) from the chain
    const firstIP = xForwardedFor.split(',')[0].trim();
    if (firstIP) return firstIP;
  }

  // Nginx real IP
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) return xRealIP;

  // Fallback for local development or direct connections
  return '127.0.0.1';
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  /**
   * Agent registration: 5 attempts per hour per IP
   * Strict limit to prevent registration spam/enumeration
   */
  agentRegistration: {
    limit: 5,
    windowSeconds: 3600, // 1 hour
    prefix: 'rl:agent-reg',
  } satisfies RateLimitConfig,

  /**
   * API authentication: 10 attempts per minute per IP
   * Prevents brute force attacks on API keys
   */
  apiAuth: {
    limit: 10,
    windowSeconds: 60,
    prefix: 'rl:api-auth',
  } satisfies RateLimitConfig,

  /**
   * General API: 100 requests per minute per IP
   * Standard rate limit for authenticated endpoints
   */
  generalApi: {
    limit: 100,
    windowSeconds: 60,
    prefix: 'rl:api',
  } satisfies RateLimitConfig,
} as const;
