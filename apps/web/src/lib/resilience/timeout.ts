/**
 * Timeout wrapper for async operations
 */

import type { TimeoutConfig } from './types'

export class TimeoutError extends Error {
  constructor(message: string, public readonly operation?: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wrap an async operation with a timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  const { timeout, name = 'operation' } = config

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${name} timed out after ${timeout}ms`, name))
    }, timeout)

    operation()
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

// Default timeout configurations
export const TIMEOUTS = {
  REDIS: 2000,      // 2 seconds for Redis
  SUPABASE: 5000,   // 5 seconds for Supabase
  WEBSOCKET: 10000, // 10 seconds for WebSocket
} as const
