/**
 * Resilient Redis client with circuit breaker, timeouts, and fallback
 */

import { getRedis } from './client'
import {
  withTimeout,
  withCircuitBreaker,
  CircuitOpenError,
  TimeoutError,
  TIMEOUTS,
  getCached,
  setCache,
  queueWrite,
} from '../resilience'

const CIRCUIT_NAME = 'redis'

/**
 * Resilient GET with fallback to cache
 */
export async function resilientGet<T>(key: string): Promise<T | null> {
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_NAME,
      () =>
        withTimeout(
          async () => {
            const redis = getRedis()
            return redis.get<T>(key)
          },
          { timeout: TIMEOUTS.REDIS, name: 'redis.get' }
        )
    )

    // Cache the fresh result
    if (result !== null) {
      setCache(key, result)
    }

    return result
  } catch (error) {
    if (error instanceof CircuitOpenError || error instanceof TimeoutError) {
      console.warn(`[ResilientRedis] GET ${key} failed, using cache fallback`)
      return getCached<T>(key)
    }
    throw error
  }
}

/**
 * Resilient SET with write queue fallback
 */
export async function resilientSet<T>(
  key: string,
  value: T,
  options?: { ex?: number }
): Promise<boolean> {
  try {
    await withCircuitBreaker(
      CIRCUIT_NAME,
      () =>
        withTimeout(
          async () => {
            const redis = getRedis()
            if (options?.ex) {
              await redis.set(key, value, { ex: options.ex })
            } else {
              await redis.set(key, value)
            }
          },
          { timeout: TIMEOUTS.REDIS, name: 'redis.set' }
        )
    )

    // Update cache
    setCache(key, value)
    return true
  } catch (error) {
    if (error instanceof CircuitOpenError || error instanceof TimeoutError) {
      console.warn(`[ResilientRedis] SET ${key} failed, queueing write`)
      setCache(key, value) // Update local cache
      queueWrite('set', [key, value, options])
      return false // Indicates queued, not committed
    }
    throw error
  }
}

/**
 * Resilient INCR with write queue fallback
 */
export async function resilientIncr(key: string): Promise<number | null> {
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_NAME,
      () =>
        withTimeout(
          async () => {
            const redis = getRedis()
            return redis.incr(key)
          },
          { timeout: TIMEOUTS.REDIS, name: 'redis.incr' }
        )
    )

    return result
  } catch (error) {
    if (error instanceof CircuitOpenError || error instanceof TimeoutError) {
      console.warn(`[ResilientRedis] INCR ${key} failed, queueing write`)
      queueWrite('incr', [key])
      return null
    }
    throw error
  }
}

/**
 * Resilient pipeline for atomic operations
 * Note: Pipeline operations can't easily use cache fallback
 */
export async function resilientPipeline<T>(
  operations: (redis: ReturnType<typeof getRedis>) => Promise<T>
): Promise<T | null> {
  try {
    return await withCircuitBreaker(
      CIRCUIT_NAME,
      () =>
        withTimeout(
          async () => {
            const redis = getRedis()
            return operations(redis)
          },
          { timeout: TIMEOUTS.REDIS * 2, name: 'redis.pipeline' }
        )
    )
  } catch (error) {
    if (error instanceof CircuitOpenError || error instanceof TimeoutError) {
      console.error('[ResilientRedis] Pipeline failed, no fallback available')
      return null
    }
    throw error
  }
}

/**
 * Health check - useful for /api/health endpoint
 */
export async function checkRedisHealth(): Promise<{
  healthy: boolean
  latency?: number
  error?: string
}> {
  const start = Date.now()
  try {
    await withTimeout(
      async () => {
        const redis = getRedis()
        await redis.ping()
      },
      { timeout: TIMEOUTS.REDIS, name: 'redis.ping' }
    )
    return { healthy: true, latency: Date.now() - start }
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
