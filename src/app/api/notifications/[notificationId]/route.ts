import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  isValidUUID,
} from '@/lib/security'

// ============================================
// PATCH — Mark a notification as read
// Body: { read: true }
// Only the notification owner can update
// ============================================

export async function PATCH(
  request: Request,
  { params }: { params: { notificationId: string } }
) {
  try {
    const { notificationId } = params

    if (!isValidUUID(notificationId)) {
      return NextResponse.json({ error: 'Identifiant de notification invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('notifications-patch', RATE_LIMITS.api)
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

    if (body.read !== true) {
      return NextResponse.json(
        { error: "Le champ 'read' doit etre true" },
        { status: 400 }
      )
    }

    // Verify the notification belongs to this user (ownership check)
    const { data: existing } = await supabase
      .from('team_notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .eq('client_id', client.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Notification introuvable' }, { status: 404 })
    }

    const adminClient = createServiceRoleClient()

    const { data: notification, error: updateError } = await adminClient
      .from('team_notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (updateError || !notification) {
      console.error('[notifications/[notificationId] PATCH] Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour de la notification' }, { status: 500 })
    }

    return NextResponse.json({ notification })
  } catch (err) {
    console.error('[notifications/[notificationId] PATCH] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
