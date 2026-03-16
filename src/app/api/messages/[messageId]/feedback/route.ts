import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'
import type { FeedbackType } from '@/types/database'

export const dynamic = 'force-dynamic'
const VALID_FEEDBACK: FeedbackType[] = ['positive', 'negative']

// ============================================
// PATCH — Submit feedback on a message
// Body: { feedback: 'positive' | 'negative', feedback_comment? }
// Ownership: message → conversation → client
// ============================================

export async function PATCH(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { messageId } = params

    if (!isValidUUID(messageId)) {
      return NextResponse.json({ error: 'Identifiant de message invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('messages-feedback-patch', RATE_LIMITS.api)
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

    // Fetch the message with conversation to verify ownership chain:
    // message → conversation (client_id must match)
    const { data: message } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        role,
        conversations!inner(client_id)
      `)
      .eq('id', messageId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message introuvable' }, { status: 404 })
    }

    // Verify ownership through the conversation chain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convClientId = (message as any).conversations?.client_id
    if (convClientId !== client.id) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.feedback) {
      return NextResponse.json({ error: 'Le champ \'feedback\' est requis' }, { status: 400 })
    }

    if (!VALID_FEEDBACK.includes(body.feedback as FeedbackType)) {
      return NextResponse.json(
        { error: `Valeur de feedback invalide. Valeurs acceptees : ${VALID_FEEDBACK.join(', ')}` },
        { status: 400 }
      )
    }

    const feedback: FeedbackType = body.feedback
    const feedback_comment: string | null = body.feedback_comment
      ? sanitizeString(body.feedback_comment, 2000) || null
      : null

    const adminClient = createServiceRoleClient()

    const { data: updatedMessage, error: updateError } = await adminClient
      .from('messages')
      .update({ feedback, feedback_comment })
      .eq('id', messageId)
      .select()
      .single()

    if (updateError || !updatedMessage) {
      console.error('[messages/feedback PATCH] Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour du feedback' }, { status: 500 })
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (err) {
    console.error('[messages/feedback PATCH] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
