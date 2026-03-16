import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/social/oauth'
import type { SocialPlatform } from '@/types/database'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
const VALID_PLATFORMS: SocialPlatform[] = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'google_ads']

/**
 * GET /api/social/auth/[platform]/connect
 * Initiates OAuth flow for the given platform.
 */
export async function GET(
  _request: Request,
  { params }: { params: { platform: string } }
) {
  try {
    const { platform } = params

    if (!VALID_PLATFORMS.includes(platform as SocialPlatform)) {
      return NextResponse.json({ error: 'Plateforme invalide' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    // Get client_id for the user
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) {
      return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })
    }

    // Generate state token (CSRF protection)
    const stateData = {
      platform,
      clientId: profile.client_id,
      userId: user.id,
      nonce: crypto.randomBytes(16).toString('hex'),
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

    // Build auth URL
    const { url, codeVerifier } = buildAuthUrl(platform as SocialPlatform, state)

    // Store state and code verifier in cookies
    const cookieStore = cookies()
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    if (codeVerifier) {
      cookieStore.set('oauth_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      })
    }

    return NextResponse.redirect(url)
  } catch (error) {
    console.error('OAuth connect error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
