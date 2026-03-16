import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'

// ============================================
// POST — Share a conversation with team or specific users
// Body: { shared_with_team?, shared_with_users?, note? }
// ============================================

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params

    if (!isValidUUID(conversationId)) {
      return NextResponse.json({ error: 'Identifiant de conversation invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('conversations-share-post', RATE_LIMITS.api)
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

    // Verify the conversation belongs to this client
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, agent_id, title')
      .eq('id', conversationId)
      .eq('client_id', client.id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const body = await request.json()

    const sharedWithTeam: boolean = body.shared_with_team === true
    const sharedWithUsers: string[] = Array.isArray(body.shared_with_users)
      ? body.shared_with_users.filter((id: unknown) => typeof id === 'string' && isValidUUID(id))
      : []
    const note: string | null = body.note ? sanitizeString(body.note, 1000) || null : null

    // Must share with at least something
    if (!sharedWithTeam && sharedWithUsers.length === 0) {
      return NextResponse.json(
        { error: 'Vous devez partager avec l\'equipe ou au moins un utilisateur' },
        { status: 400 }
      )
    }

    const adminClient = createServiceRoleClient()

    // Create shared_conversations record
    const { data: sharedConv, error: shareError } = await adminClient
      .from('shared_conversations')
      .insert({
        conversation_id: conversationId,
        shared_by: user.id,
        shared_with_team: sharedWithTeam,
        shared_with_users: sharedWithUsers,
        note,
      })
      .select()
      .single()

    if (shareError || !sharedConv) {
      console.error('[conversations/share POST] Insert shared_conversations error:', shareError)
      return NextResponse.json({ error: 'Erreur lors du partage de la conversation' }, { status: 500 })
    }

    // Create team_notifications for each explicitly named user
    if (sharedWithUsers.length > 0) {
      const conversationTitle = conversation.title ?? 'Conversation sans titre'
      const notificationsToInsert = sharedWithUsers.map((userId: string) => ({
        client_id: client.id,
        user_id: userId,
        type: 'share' as const,
        title: 'Conversation partagee avec vous',
        body: note
          ? `${conversationTitle} — ${note}`
          : conversationTitle,
        reference_type: 'conversation',
        reference_id: conversationId,
        read: false,
      }))

      const { error: notifError } = await adminClient
        .from('team_notifications')
        .insert(notificationsToInsert)

      if (notifError) {
        console.error('[conversations/share POST] Insert team_notifications error:', notifError)
        // Non-blocking: share was created, just log the notification failure
      }
    }

    return NextResponse.json({ shared_conversation: sharedConv }, { status: 201 })
  } catch (err) {
    console.error('[conversations/share POST] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
