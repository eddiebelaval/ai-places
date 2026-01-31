import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis/client'
import { createClient } from '@/lib/supabase/server'

interface ServiceStatus {
  status: 'ok' | 'error' | 'degraded'
  latency?: number
  error?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    redis: ServiceStatus
    supabase: ServiceStatus
    websocket: ServiceStatus
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const redis = getRedis()
    await redis.ping()
    return { status: 'ok', latency: Date.now() - start }
  } catch (error) {
    return {
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Redis connection failed',
    }
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    // Simple auth check - doesn't require a session
    const { error } = await supabase.auth.getSession()
    if (error) throw error
    return { status: 'ok', latency: Date.now() - start }
  } catch (error) {
    return {
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Supabase connection failed',
    }
  }
}

async function checkWebSocket(): Promise<ServiceStatus> {
  // WebSocket health is harder to check from server-side
  // Just verify the URL is configured
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL
  if (!wsUrl) {
    return { status: 'degraded', error: 'WS_URL not configured' }
  }
  return { status: 'ok' }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [redis, supabase, websocket] = await Promise.all([
    checkRedis(),
    checkSupabase(),
    checkWebSocket(),
  ])

  const services = { redis, supabase, websocket }

  // Determine overall status
  const hasError = Object.values(services).some((s) => s.status === 'error')
  const hasDegraded = Object.values(services).some((s) => s.status === 'degraded')

  let status: HealthResponse['status'] = 'healthy'
  if (hasError) status = 'unhealthy'
  else if (hasDegraded) status = 'degraded'

  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    services,
  }

  return NextResponse.json(response, {
    status: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
