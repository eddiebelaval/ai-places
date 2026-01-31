/**
 * Resilience module types
 */

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failures: number
  lastFailure: number | null
  successCount: number
}

export interface CircuitBreakerConfig {
  failureThreshold: number      // Failures before opening circuit
  resetTimeout: number          // Ms before trying half-open
  successThreshold: number      // Successes in half-open before closing
}

export interface TimeoutConfig {
  timeout: number               // Ms before timeout
  name?: string                 // For logging
}

export interface DegradedModeConfig {
  staleDataTtl: number          // How long to serve stale data
  maxQueueSize: number          // Max pending writes to queue
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  stale: boolean
}

export interface WriteQueueEntry {
  operation: string
  args: unknown[]
  timestamp: number
  retries: number
}
