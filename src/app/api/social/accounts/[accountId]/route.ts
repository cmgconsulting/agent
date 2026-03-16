import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security'

export const dynamic = 'force-dynamic'
/**
 * GET /api/social/accounts/[accountId]
 * Get details of a social account (tokens masked).
 */
export async function GET(
  _request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params
    if (!isValidUUID(accountId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('id, client_id, platform, platform_user_id, platform_username, display_name, profile_image_url, token_expires_at, scopes, page_id, page_name, status, last_error, last_synced_at, connected_at, created_at, updated_at')
      .eq('id', accountId)
      .single()

    if (error || !account) return NextResponse.json({ error: 'Compte non trouve' }, { status: 404 })

    return NextResponse.json({ account })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/social/accounts/[accountId]
 * Disconnect a social account.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params
    if (!isValidUUID(accountId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', accountId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
