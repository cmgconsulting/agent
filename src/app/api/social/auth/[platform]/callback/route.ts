import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, fetchUserProfile } from '@/lib/social/oauth'
import { encryptCredentials } from '@/lib/vault'
import type { SocialPlatform } from '@/types/database'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * GET /api/social/auth/[platform]/callback
 * Handles OAuth callback, exchanges code for tokens, stores account.
 */
export async function GET(
  request: Request,
  { params }: { params: { platform: string } }
) {
  try {
    const { platform } = params
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      const errorDesc = url.searchParams.get('error_description') || error
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent(errorDesc)}`
      )
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('Parametres OAuth manquants')}`
      )
    }

    // Verify state (CSRF protection)
    const cookieStore = cookies()
    const storedState = cookieStore.get('oauth_state')?.value

    if (!storedState || storedState !== stateParam) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('State OAuth invalide')}`
      )
    }

    // Parse state
    let stateData: { platform: string; clientId: string; userId: string }
    try {
      stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('State OAuth corrompu')}`
      )
    }

    if (stateData.platform !== platform) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('Plateforme invalide')}`
      )
    }

    // Get code verifier for PKCE (Twitter)
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      platform as SocialPlatform,
      code,
      codeVerifier
    )

    // Fetch user profile
    const profile = await fetchUserProfile(platform as SocialPlatform, tokens.accessToken)

    // Encrypt tokens
    const accessTokenEncrypted = encryptCredentials({ token: tokens.accessToken })
    const refreshTokenEncrypted = tokens.refreshToken
      ? encryptCredentials({ token: tokens.refreshToken })
      : null

    // Calculate token expiry
    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('Session expiree')}`
      )
    }

    // Upsert social account
    const accountData = {
      client_id: stateData.clientId,
      platform: platform as SocialPlatform,
      platform_user_id: profile.userId,
      platform_username: profile.username || null,
      display_name: profile.displayName || null,
      profile_image_url: profile.profileImageUrl || null,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: tokenExpiresAt,
      scopes: tokens.scope?.split(/[, ]/).filter(Boolean) || [],
      page_id: profile.pageId || null,
      page_name: profile.pageName || null,
      status: 'active' as const,
      last_error: null,
      connected_at: new Date().toISOString(),
    }

    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert(accountData, {
        onConflict: 'client_id,platform,platform_user_id',
      })

    if (dbError) {
      console.error('DB upsert error:', dbError)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('Erreur sauvegarde compte')}`
      )
    }

    // Clean up cookies
    cookieStore.delete('oauth_state')
    cookieStore.delete('oauth_code_verifier')

    return NextResponse.redirect(
      `${APP_URL}/dashboard/social/accounts?connected=${platform}`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/social/accounts?error=${encodeURIComponent('Erreur connexion OAuth')}`
    )
  }
}
