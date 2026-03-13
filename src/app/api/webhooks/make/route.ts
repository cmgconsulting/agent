import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS, isValidUUID, sanitizeString } from '@/lib/security'

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`webhook:${ip}`, RATE_LIMITS.webhook)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await request.json()

    // Validate webhook secret if configured
    const secret = request.headers.get('x-webhook-secret')
    if (process.env.MAKE_WEBHOOK_SECRET && secret !== process.env.MAKE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    const { client_id, agent_type, event_type, payload } = body

    if (!client_id || !event_type) {
      return NextResponse.json({ error: 'client_id and event_type required' }, { status: 400 })
    }

    if (!isValidUUID(client_id)) {
      return NextResponse.json({ error: 'Invalid client_id format' }, { status: 400 })
    }

    const safeEventType = sanitizeString(event_type, 200)
    const adminClient = createServiceRoleClient()

    // Log the incoming webhook event
    if (agent_type) {
      const { data: agent } = await adminClient
        .from('agents')
        .select('id')
        .eq('client_id', client_id)
        .eq('type', agent_type)
        .single()

      if (agent) {
        await adminClient.from('agent_logs').insert({
          agent_id: agent.id,
          client_id,
          action: `Webhook Make.com: ${safeEventType}`,
          status: 'info',
          payload_summary: JSON.stringify(payload || {}).slice(0, 500),
        })
      }
    }

    return NextResponse.json({ received: true, event_type: safeEventType })
  } catch (err) {
    console.error('Make webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
