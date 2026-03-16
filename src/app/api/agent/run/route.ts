import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { runAgent, type AgentContext } from '@/lib/agent-framework'
import type { AgentType } from '@/types/database'
import { checkRateLimit, RATE_LIMITS, sanitizeString, isValidUUID } from '@/lib/security'

export const dynamic = 'force-dynamic'
const VALID_AGENT_TYPES: AgentType[] = ['eva', 'ludo', 'marc', 'leo', 'hugo', 'sofia', 'felix', 'iris']

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    // Rate limiting per user
    const rl = checkRateLimit(`agent:${user.id}`, RATE_LIMITS.agentRun)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    const { agentType, clientId, message, trigger } = body

    // Validate agent type
    if (!agentType || !VALID_AGENT_TYPES.includes(agentType)) {
      return NextResponse.json({ error: 'Type d\'agent invalide' }, { status: 400 })
    }

    // Validate clientId format if provided
    if (clientId && !isValidUUID(clientId)) {
      return NextResponse.json({ error: 'Format clientId invalide' }, { status: 400 })
    }

    // Sanitize user message
    const sanitizedMessage = message ? sanitizeString(message, 5000) : undefined

    // Determine clientId based on role
    let resolvedClientId = clientId
    if (profile?.role === 'client') {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!client) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })
      resolvedClientId = client.id
    } else if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }

    if (!resolvedClientId) {
      return NextResponse.json({ error: 'clientId requis' }, { status: 400 })
    }

    const context: AgentContext = {
      clientId: resolvedClientId,
      agentType,
      userMessage: sanitizedMessage,
      trigger: trigger || 'manual',
    }

    const result = await runAgent(context)

    return NextResponse.json(result)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[agent/run] Error:', errMsg)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
