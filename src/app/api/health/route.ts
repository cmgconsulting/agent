import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: { status: string; latencyMs: number }
    anthropic: { status: string; configured: boolean }
    encryption: { status: string }
  }
}

const startTime = Date.now()

export async function GET() {
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'unknown', latencyMs: 0 },
      anthropic: { status: 'unknown', configured: false },
      encryption: { status: 'unknown' },
    },
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    health.checks.database.latencyMs = Date.now() - dbStart

    if (error) {
      health.checks.database.status = 'error'
      health.status = 'degraded'
    } else {
      health.checks.database.status = 'ok'
    }
  } catch {
    health.checks.database.status = 'unreachable'
    health.status = 'unhealthy'
  }

  // Check Anthropic API key configuration
  health.checks.anthropic.configured = !!process.env.ANTHROPIC_API_KEY
  health.checks.anthropic.status = process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'
  if (!process.env.ANTHROPIC_API_KEY) {
    health.status = 'degraded'
  }

  // Check encryption key
  health.checks.encryption.status = process.env.ENCRYPTION_KEY ? 'configured' : 'missing'
  if (!process.env.ENCRYPTION_KEY) {
    health.status = 'degraded'
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
