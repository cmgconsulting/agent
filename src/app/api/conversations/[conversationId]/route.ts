import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'
import type { ConversationStatus } from '@/types/database'

export const dynamic = 'force-dynamic'
const VALID_STATUSES: ConversationStatus[] = ['active', 'archived']

// ============================================
// GET — Conversation detail with messages + agent info
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params

    if (!isValidUUID(conversationId)) {
      return NextResponse.json({ error: 'Identifiant de conversation invalide' }, { status: 400 })
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

    // Fetch conversation with agent info (ownership enforced via client_id)
    const { data: conversation, error: convError } = await supabase
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
        agents(id, name, type, active)
      `)
      .eq('id', conversationId)
      .eq('client_id', client.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    // Fetch all messages ordered by created_at ASC
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('[conversations/[id] GET] Messages error:', messagesError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des messages' }, { status: 500 })
    }

    return NextResponse.json({ conversation, messages: messages || [] })
  } catch (err) {
    console.error('[conversations/[id] GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// PATCH — Update title, status, or metadata
// Body: { title?, status?, metadata? }
// ============================================

export async function PATCH(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params

    if (!isValidUUID(conversationId)) {
      return NextResponse.json({ error: 'Identifiant de conversation invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('conversations-patch', RATE_LIMITS.api)
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

    // Verify ownership
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('client_id', client.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const body = await request.json()

    // Build update payload with only provided fields
    const updatePayload: Record<string, unknown> = {}

    if (body.title !== undefined) {
      updatePayload.title = body.title ? sanitizeString(body.title, 255) || null : null
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as ConversationStatus)) {
        return NextResponse.json(
          { error: `Statut invalide. Valeurs acceptees : ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updatePayload.status = body.status
    }

    if (body.metadata !== undefined) {
      if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
        return NextResponse.json({ error: 'Le champ \'metadata\' doit etre un objet' }, { status: 400 })
      }
      updatePayload.metadata = body.metadata
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Aucun champ a mettre a jour' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    const { data: conversation, error: updateError } = await adminClient
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .select()
      .single()

    if (updateError || !conversation) {
      console.error('[conversations/[id] PATCH] Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour de la conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (err) {
    console.error('[conversations/[id] PATCH] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// DELETE — Delete conversation (cascades messages)
// ============================================

export async function DELETE(
  _request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params

    if (!isValidUUID(conversationId)) {
      return NextResponse.json({ error: 'Identifiant de conversation invalide' }, { status: 400 })
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

    // Verify ownership
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('client_id', client.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const adminClient = createServiceRoleClient()

    const { error: deleteError } = await adminClient
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (deleteError) {
      console.error('[conversations/[id] DELETE] Error:', deleteError)
      return NextResponse.json({ error: 'Erreur lors de la suppression de la conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[conversations/[id] DELETE] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
