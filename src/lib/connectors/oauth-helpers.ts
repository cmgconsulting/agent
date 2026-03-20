import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encryptCredentials } from '@/lib/vault'
import crypto from 'crypto'
import type { ConnectorType } from '@/types/database'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ===== Shared OAuth Initiation =====

interface OAuthInitConfig {
  authUrl: string
  clientIdEnvVar: string
  redirectPath: string
  scopes: string[]
  cookieName: string
  extraParams?: Record<string, string>
}

export async function initiateOAuth(config: OAuthInitConfig) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Non authentifie')}`)
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client?.id) {
      return NextResponse.redirect(`${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Profil introuvable')}`)
    }

    const clientId = process.env[config.clientIdEnvVar] || ''
    if (!clientId) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Configuration OAuth manquante — contactez le support')}`
      )
    }

    const stateData = {
      clientId: client.id,
      userId: user.id,
      nonce: crypto.randomBytes(16).toString('hex'),
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

    const cookieStore = cookies()
    cookieStore.set(config.cookieName, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    const authUrlObj = new URL(config.authUrl)
    authUrlObj.searchParams.set('response_type', 'code')
    authUrlObj.searchParams.set('client_id', clientId)
    authUrlObj.searchParams.set('redirect_uri', `${APP_URL}${config.redirectPath}`)
    authUrlObj.searchParams.set('state', state)
    authUrlObj.searchParams.set('scope', config.scopes.join(' '))

    if (config.extraParams) {
      for (const [key, val] of Object.entries(config.extraParams)) {
        authUrlObj.searchParams.set(key, val)
      }
    }

    return NextResponse.redirect(authUrlObj.toString())
  } catch (error) {
    console.error('OAuth init error:', error)
    return NextResponse.redirect(`${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur OAuth')}`)
  }
}

// ===== Shared OAuth Callback =====

interface OAuthCallbackConfig {
  tokenUrl: string
  clientIdEnvVar: string
  clientSecretEnvVar: string
  redirectPath: string
  cookieName: string
  connectorType: ConnectorType
  connectorName: string
  scopes: string[]
  tokenBodyFormat?: 'urlencoded' | 'json'
  extractTokens?: (data: Record<string, unknown>) => { access_token: string; refresh_token: string; expires_at?: string }
}

export async function handleOAuthCallback(request: Request, config: OAuthCallbackConfig) {
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
    const storedState = cookieStore.get(config.cookieName)?.value
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

    const clientId = process.env[config.clientIdEnvVar] || ''
    const clientSecret = process.env[config.clientSecretEnvVar] || ''

    // Exchange code for tokens
    const tokenBody: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${APP_URL}${config.redirectPath}`,
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': config.tokenBodyFormat === 'json'
          ? 'application/json'
          : 'application/x-www-form-urlencoded',
      },
      body: config.tokenBodyFormat === 'json'
        ? JSON.stringify(tokenBody)
        : new URLSearchParams(tokenBody),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error(`${config.connectorName} token exchange error:`, err)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur echange token ' + config.connectorName)}`
      )
    }

    const tokenData = await tokenRes.json()

    const rawTokens = config.extractTokens
      ? config.extractTokens(tokenData)
      : {
          access_token: tokenData.access_token || '',
          refresh_token: tokenData.refresh_token || '',
          expires_at: undefined as string | undefined,
        }

    // Add expiry if available
    let expiresAt = rawTokens.expires_at
    if (tokenData.expires_in && !expiresAt) {
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    }

    const encryptedCreds = encryptCredentials({
      access_token: rawTokens.access_token,
      refresh_token: rawTokens.refresh_token,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
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
        type: config.connectorType,
        status: 'active',
        credentials_encrypted: encryptedCreds,
        last_tested_at: new Date().toISOString(),
        config: { scopes: config.scopes },
      }, {
        onConflict: 'client_id,type',
      })

    if (dbError) {
      console.error(`${config.connectorName} connector upsert error:`, dbError)
      return NextResponse.redirect(
        `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur sauvegarde')}`
      )
    }

    cookieStore.delete(config.cookieName)

    return NextResponse.redirect(
      `${APP_URL}/dashboard/connectors?connected=${config.connectorType}`
    )
  } catch (error) {
    console.error(`${config.connectorName} callback error:`, error)
    return NextResponse.redirect(
      `${APP_URL}/dashboard/connectors?error=${encodeURIComponent('Erreur connexion OAuth')}`
    )
  }
}
