import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidEmail,
} from '@/lib/security'
import type { TeamRole } from '@/types/database'

export const dynamic = 'force-dynamic'
const VALID_INVITE_ROLES: TeamRole[] = ['manager', 'member', 'viewer']

// ============================================
// POST — Invite a new team member
// Body: { email, full_name?, role_in_team: 'manager' | 'member' | 'viewer' }
//
// Only owner (role_in_team = 'owner' or null / not set) or manager can invite.
// Creates a Supabase Auth user with app_metadata.client_id set,
// then creates a profiles row with role='client' and the specified role_in_team.
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('team-invite-post', RATE_LIMITS.auth)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requetes. Reessayez plus tard.' }, { status: 429 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Check if the inviter has permission (owner or manager)
    // The owner is identified by clients.user_id === user.id
    // Managers have role_in_team = 'manager' in profiles
    const isOwner = client.user_id === user.id

    if (!isOwner) {
      // Check if the user is a manager
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('role_in_team')
        .eq('id', user.id)
        .single()

      const isManager = inviterProfile?.role_in_team === 'manager'

      if (!isManager) {
        return NextResponse.json(
          { error: 'Permission refusee. Seuls les proprietaires et managers peuvent inviter des membres.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()

    // Validate required fields
    if (!body.email) {
      return NextResponse.json({ error: "Le champ 'email' est requis" }, { status: 400 })
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 })
    }

    if (!body.role_in_team) {
      return NextResponse.json({ error: "Le champ 'role_in_team' est requis" }, { status: 400 })
    }

    if (!VALID_INVITE_ROLES.includes(body.role_in_team as TeamRole)) {
      return NextResponse.json(
        { error: `Role invalide. Valeurs acceptees : ${VALID_INVITE_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    const email      = body.email.toLowerCase().trim()
    const fullName   = body.full_name ? sanitizeString(body.full_name, 255) || null : null
    const roleInTeam = body.role_in_team as TeamRole

    const adminClient = createServiceRoleClient()

    // Create the Supabase Auth user
    // email_confirm: true means no verification email is sent; the user can log in immediately.
    // app_metadata.client_id links them to the client for team membership discovery.
    const { data: newAuthUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        client_id: client.id,
      },
      app_metadata: {
        client_id: client.id,
        role:      'client',
      },
    })

    if (createUserError || !newAuthUser.user) {
      console.error('[team/invite POST] createUser error:', createUserError)
      // Provide a user-friendly message for duplicate emails
      if (createUserError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Un utilisateur avec cet email existe deja' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: "Erreur lors de la creation de l'utilisateur" },
        { status: 500 }
      )
    }

    const newUserId = newAuthUser.user.id

    // Create the profile record for the new user
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id:           newUserId,
        email,
        full_name:    fullName,
        role:         'client',
        role_in_team: roleInTeam,
        avatar_url:   null,
      })

    if (profileError) {
      console.error('[team/invite POST] Profile insert error:', profileError)
      // Attempt to clean up the auth user so data stays consistent
      await adminClient.auth.admin.deleteUser(newUserId)
      return NextResponse.json(
        { error: 'Erreur lors de la creation du profil' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, user_id: newUserId },
      { status: 201 }
    )
  } catch (err) {
    console.error('[team/invite POST] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
