import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// ============================================
// GET — List all team members for the authenticated user's client
//
// Strategy:
//   1. Authenticate the user and resolve their client_id
//   2. Use the service-role admin to list all auth users
//   3. Filter by app_metadata.client_id matching the current client
//   4. Fetch their profile records and merge
//
// The owner is linked via clients.user_id; additional members have
// app_metadata.client_id set by the invite endpoint.
// ============================================

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const adminClient = createServiceRoleClient()

    // List all auth users and filter by client_id in app_metadata
    // listUsers returns up to 1000 users; sufficient for a team
    const { data: authData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (listError) {
      console.error('[team/members GET] listUsers error:', listError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des membres' }, { status: 500 })
    }

    // Collect user IDs for this client:
    // - The owner (clients.user_id)
    // - Invited members (app_metadata.client_id === client.id)
    const memberUserIds = new Set<string>()
    memberUserIds.add(client.user_id)

    for (const authUser of authData.users) {
      const meta = authUser.app_metadata as Record<string, unknown> | undefined
      if (meta?.client_id === client.id) {
        memberUserIds.add(authUser.id)
      }
    }

    if (memberUserIds.size === 0) {
      return NextResponse.json({ members: [] })
    }

    // Fetch profiles for all member user IDs
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role_in_team, avatar_url, created_at')
      .in('id', Array.from(memberUserIds))
      .order('created_at', { ascending: true })

    if (profilesError) {
      console.error('[team/members GET] Profiles error:', profilesError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des profils' }, { status: 500 })
    }

    return NextResponse.json({ members: profiles || [] })
  } catch (err) {
    console.error('[team/members GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
