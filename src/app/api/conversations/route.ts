import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'
import type { ConversationStatus } from '@/types/database'

const VALID_STATUSES: ConversationStatus[] = ['active', 'archived']

// ============================================
// GET — List conversations for client
// Query params: agent_id?, search?, status? (default 'active'), limit? (default 20)
// ============================================

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const agentId   = searchParams.get('agent_id')
    const search    = searchParams.get('search')
    const statusParam = searchParams.get('status')
    const limitParam  = searchParams.get('limit')

    const status: ConversationStatus =
      statusParam && VALID_STATUSES.includes(statusParam as ConversationStatus)
        ? (statusParam as ConversationStatus)
        : 'active'

    const limit = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 100)

    // Validate agent_id if provided
    if (agentId && !isValidUUID(agentId)) {
      return NextResponse.json({ error: 'Identifiant d\'agent invalide' }, { status: 400 })
    }

    let query = supabase
      .from('conversations')
      .select(`
        id,
        client_id,
        user_id,
        agent_id,
        title,
        status,
        metadata,
        created_at,
        updated_at,
        agents(id, name, type)
      `)
      .eq('client_id', client.id)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (search) {
      const sanitizedSearch = sanitizeString(search, 200)
      if (sanitizedSearch) {
        query = query.ilike('title', `%${sanitizedSearch}%`)
      }
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error('[conversations GET] Supabase error:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (err) {
    console.error('[conversations GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// POST — Create a new conversation
// Body: { agent_id, title? }
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('conversations-post', RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requetes. Reessayez plus tard.' }, { status: 429 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const body = await request.json()

    if (!body.agent_id) {
      return NextResponse.json({ error: 'Le champ \'agent_id\' est requis' }, { status: 400 })
    }

    if (!isValidUUID(body.agent_id)) {
      return NextResponse.json({ error: 'Identifiant d\'agent invalide' }, { status: 400 })
    }

    // Verify agent belongs to this client
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', body.agent_id)
      .eq('client_id', client.id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }

    const title = body.title ? sanitizeString(body.title, 255) || null : null

    const adminClient = createServiceRoleClient()

    const { data: conversation, error: insertError } = await adminClient
      .from('conversations')
      .insert({
        client_id: client.id,
        user_id: user.id,
        agent_id: body.agent_id,
        title,
        status: 'active',
        metadata: {},
      })
      .select()
      .single()

    if (insertError || !conversation) {
      console.error('[conversations POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la creation de la conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (err) {
    console.error('[conversations POST] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
