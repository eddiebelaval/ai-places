/**
 * Circuit breaker pattern implementation
 * Prevents cascading failures by failing fast when a service is down
 */

import type { CircuitBreakerState, CircuitBreakerConfig } from './types'

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // 5 failures opens circuit
  resetTimeout: 30000,      // 30 seconds before half-open
  successThreshold: 2,      // 2 successes closes circuit
}

// Store circuit states by name
const circuits = new Map<string, CircuitBreakerState>()

function getCircuit(name: string): CircuitBreakerState {
  if (!circuits.has(name)) {
    circuits.set(name, {
      state: 'CLOSED',
      failures: 0,
      lastFailure: null,
      successCount: 0,
    })
  }
  return circuits.get(name)!
}

export class CircuitOpenError extends Error {
  constructor(public readonly circuitName: string) {
    super(`Circuit ${circuitName} is OPEN`)
    this.name = 'CircuitOpenError'
  }
}

/**
 * Execute an operation with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  name: string,
  operation: () => Promise<T>,
  config: Partial<CircuitBreakerConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const circuit = getCircuit(name)

  // Check if circuit should transition from OPEN to HALF_OPEN
  if (circuit.state === 'OPEN') {
    const now = Date.now()
    if (circuit.lastFailure && now - circuit.lastFailure >= cfg.resetTimeout) {
      circuit.state = 'HALF_OPEN'
      circuit.successCount = 0
      console.log(`[CircuitBreaker] ${name}: OPEN -> HALF_OPEN`)
    } else {
      throw new CircuitOpenError(name)
    }
  }

  try {
    const result = await operation()

    // Success handling
    if (circuit.state === 'HALF_OPEN') {
      circuit.successCount++
      if (circuit.successCount >= cfg.successThreshold) {
        circuit.state = 'CLOSED'
        circuit.failures = 0
        console.log(`[CircuitBreaker] ${name}: HALF_OPEN -> CLOSED`)
      }
    } else if (circuit.state === 'CLOSED') {
      // Reset failure count on success
      circuit.failures = 0
    }

    return result
  } catch (error) {
    // Failure handling
    circuit.failures++
    circuit.lastFailure = Date.now()

    if (circuit.state === 'HALF_OPEN') {
      // Any failure in half-open reopens circuit
      circuit.state = 'OPEN'
      console.log(`[CircuitBreaker] ${name}: HALF_OPEN -> OPEN (failure)`)
    } else if (circuit.failures >= cfg.failureThreshold) {
      circuit.state = 'OPEN'
      console.log(`[CircuitBreaker] ${name}: CLOSED -> OPEN (${circuit.failures} failures)`)
    }

    throw error
  }
}

/**
 * Get current state of a circuit
 */
export function getCircuitState(name: string): CircuitBreakerState {
  return getCircuit(name)
}

/**
 * Manually reset a circuit to closed state
 */
export function resetCircuit(name: string): void {
  const circuit = getCircuit(name)
  circuit.state = 'CLOSED'
  circuit.failures = 0
  circuit.lastFailure = null
  circuit.successCount = 0
  console.log(`[CircuitBreaker] ${name}: manually reset to CLOSED`)
}
