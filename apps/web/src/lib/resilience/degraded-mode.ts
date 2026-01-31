/**
 * Degraded mode support - serve stale data and queue writes when services are down
 */

import type { CacheEntry, WriteQueueEntry, DegradedModeConfig } from './types'

const DEFAULT_CONFIG: DegradedModeConfig = {
  staleDataTtl: 60000,    // Serve stale data up to 60 seconds old
  maxQueueSize: 100,       // Max 100 pending writes
}

// In-memory cache for degraded mode
const cache = new Map<string, CacheEntry<unknown>>()

// Write queue for when services are down
const writeQueue: WriteQueueEntry[] = []

/**
 * Get cached data, including stale data if within TTL
 */
export function getCached<T>(key: string, config: Partial<DegradedModeConfig> = {}): T | null {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const entry = cache.get(key) as CacheEntry<T> | undefined

  if (!entry) return null

  const age = Date.now() - entry.timestamp
  if (age > cfg.staleDataTtl) {
    cache.delete(key)
    return null
  }

  // Mark as stale if past freshness
  if (age > 5000) {
    entry.stale = true
  }

  return entry.data
}

/**
 * Set cache entry
 */
export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    stale: false,
  })
}

/**
 * Check if cached entry is stale
 */
export function isStale(key: string): boolean {
  const entry = cache.get(key)
  return entry?.stale ?? true
}

/**
 * Queue a write operation for later retry
 */
export function queueWrite(
  operation: string,
  args: unknown[],
  config: Partial<DegradedModeConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  if (writeQueue.length >= cfg.maxQueueSize) {
    console.warn('[DegradedMode] Write queue full, dropping oldest entry')
    writeQueue.shift()
  }

  writeQueue.push({
    operation,
    args,
    timestamp: Date.now(),
    retries: 0,
  })

  return true
}

/**
 * Get pending writes for processing
 */
export function getPendingWrites(): WriteQueueEntry[] {
  return [...writeQueue]
}

/**
 * Clear processed writes
 */
export function clearProcessedWrites(count: number): void {
  writeQueue.splice(0, count)
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): { size: number; queueLength: number } {
  return {
    size: cache.size,
    queueLength: writeQueue.length,
  }
}
