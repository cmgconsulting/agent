import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
/**
 * GET /api/social/accounts
 * List social accounts for the current client (tokens masked).
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('id, client_id, platform, platform_user_id, platform_username, display_name, profile_image_url, token_expires_at, scopes, page_id, page_name, status, last_error, last_synced_at, connected_at, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ accounts: accounts || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
