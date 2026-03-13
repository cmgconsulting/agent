import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/vault'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/gmail/callback`
  : 'http://localhost:3000/api/oauth/gmail/callback'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/admin?error=oauth_denied', request.url))
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL('/admin?error=oauth_missing_params', request.url))
  }

  let state: { clientId: string; adminId: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/admin?error=oauth_invalid_state', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(new URL('/admin?error=oauth_token_failed', request.url))
    }

    // Get user email
    const profileRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const gmailProfile = profileRes.ok ? await profileRes.json() : {}

    // Store encrypted credentials
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: String(Date.now() + (tokens.expires_in || 3600) * 1000),
    }

    const adminClient = createServiceRoleClient()

    // Check if Gmail connector already exists for this client
    const { data: existing } = await adminClient
      .from('connectors')
      .select('id')
      .eq('client_id', state.clientId)
      .eq('type', 'gmail')
      .single()

    if (existing) {
      // Update existing connector
      await adminClient
        .from('connectors')
        .update({
          credentials_encrypted: encryptCredentials(credentials),
          status: 'active',
          label: gmailProfile.emailAddress || 'Gmail',
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      // Create new connector
      await adminClient
        .from('connectors')
        .insert({
          client_id: state.clientId,
          type: 'gmail',
          label: gmailProfile.emailAddress || 'Gmail',
          credentials_encrypted: encryptCredentials(credentials),
          status: 'active',
          last_tested_at: new Date().toISOString(),
        })
    }

    // Audit log
    await adminClient.from('admin_audit_log').insert({
      admin_id: state.adminId,
      action: 'connect_gmail_oauth',
      target_type: 'connector',
      details: { client_id: state.clientId, email: gmailProfile.emailAddress },
    })

    return NextResponse.redirect(
      new URL(`/admin/clients/${state.clientId}/connectors?success=gmail`, request.url)
    )
  } catch (err) {
    console.error('Gmail OAuth callback error:', err)
    return NextResponse.redirect(new URL('/admin?error=oauth_server_error', request.url))
  }
}
