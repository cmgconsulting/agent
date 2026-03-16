import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encryptCredentials } from '@/lib/vault'

export const dynamic = 'force-dynamic'
const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || ''
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/connectors/google-ads/callback`

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Parametres OAuth manquants')}`
      )
    }

    // Verify state
    const cookieStore = cookies()
    const storedState = cookieStore.get('gads_oauth_state')?.value
    if (!storedState || storedState !== stateParam) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('State OAuth invalide')}`
      )
    }

    let stateData: { clientId: string; userId: string }
    try {
      stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('State OAuth corrompu')}`
      )
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_ADS_CLIENT_ID,
        client_secret: GOOGLE_ADS_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Google Ads token exchange error:', err)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur echange token')}`
      )
    }

    const tokens = await tokenRes.json()
    const encryptedCreds = encryptCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
    })

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Session expiree')}`
      )
    }

    // Upsert connector
    const { error: dbError } = await supabase
      .from('connectors')
      .upsert({
        client_id: stateData.clientId,
        type: 'google_ads',
        name: 'Google Ads',
        status: 'active',
        credentials_encrypted: encryptedCreds,
        last_sync_at: new Date().toISOString(),
        config: { scopes: ['adwords'] },
      }, {
        onConflict: 'client_id,type',
      })

    if (dbError) {
      console.error('Google Ads connector upsert error:', dbError)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur sauvegarde connecteur')}`
      )
    }

    cookieStore.delete('gads_oauth_state')

    return NextResponse.redirect(
      `${APP_URL}/dashboard/connectors?connected=google_ads`
    )
  } catch (error) {
    console.error('Google Ads callback error:', error)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur connexion OAuth')}`
    )
  }
}
