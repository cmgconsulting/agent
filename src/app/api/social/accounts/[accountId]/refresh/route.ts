import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security'
import { decryptCredentials, encryptCredentials } from '@/lib/vault'
import { refreshAccessToken } from '@/lib/social/oauth'
import type { SocialPlatform } from '@/types/database'

/**
 * POST /api/social/accounts/[accountId]/refresh
 * Force refresh the OAuth token for a social account.
 */
export async function POST(
  _request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params
    if (!isValidUUID(accountId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    // Get account with encrypted tokens
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (error || !account) return NextResponse.json({ error: 'Compte non trouve' }, { status: 404 })

    if (!account.refresh_token_encrypted) {
      return NextResponse.json({ error: 'Pas de refresh token disponible' }, { status: 400 })
    }

    // Decrypt refresh token
    const { token: refreshToken } = decryptCredentials(account.refresh_token_encrypted)

    // Refresh tokens
    const tokens = await refreshAccessToken(account.platform as SocialPlatform, refreshToken)

    // Encrypt new tokens
    const newAccessTokenEncrypted = encryptCredentials({ token: tokens.accessToken })
    const newRefreshTokenEncrypted = tokens.refreshToken
      ? encryptCredentials({ token: tokens.refreshToken })
      : account.refresh_token_encrypted

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null

    // Update account
    const { error: updateError } = await supabase
      .from('social_accounts')
      .update({
        access_token_encrypted: newAccessTokenEncrypted,
        refresh_token_encrypted: newRefreshTokenEncrypted,
        token_expires_at: tokenExpiresAt,
        status: 'active',
        last_error: null,
      })
      .eq('id', accountId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true, expiresAt: tokenExpiresAt })
  } catch (error) {
    // Update account status to error
    const supabase = createServerSupabaseClient()
    await supabase
      .from('social_accounts')
      .update({ status: 'error', last_error: (error as Error).message })
      .eq('id', params.accountId)

    return NextResponse.json({ error: 'Echec du refresh token' }, { status: 500 })
  }
}
