/**
 * Centralized OAuth token refresh utilities
 *
 * Handles token expiry detection, refresh across providers (Google, Meta, LinkedIn),
 * DB persistence of new tokens, and user notification on refresh failure.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { encryptCredentials } from '@/lib/vault'
import type { ConnectorType } from '@/types/database'

// 5-minute safety margin before expiry
const EXPIRY_MARGIN_MS = 5 * 60 * 1000

// ===== Token expiry check =====

export function isTokenExpired(credentials: Record<string, string>): boolean {
  const expiresAt = credentials.expires_at
  if (!expiresAt) return true // No expiry info → assume expired
  return Date.now() >= parseInt(expiresAt) - EXPIRY_MARGIN_MS
}

// ===== Provider-specific refresh =====

interface RefreshResult {
  access_token: string
  expires_at: number // Unix ms
}

const GOOGLE_CONNECTOR_TYPES: ConnectorType[] = ['gmail', 'google_ads', 'google_analytics']

function getGoogleClientCredentials(connectorType: ConnectorType): { clientId: string; clientSecret: string } {
  if (connectorType === 'google_analytics') {
    return {
      clientId: process.env.GOOGLE_ANALYTICS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }
  }
  if (connectorType === 'google_ads') {
    return {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }
  }
  // gmail and other Google connectors
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  }
}

async function refreshGoogleToken(
  connectorType: ConnectorType,
  credentials: Record<string, string>
): Promise<RefreshResult> {
  if (!credentials.refresh_token) {
    throw new Error('No refresh_token — reconnection required')
  }

  const { clientId, clientSecret } = getGoogleClientCredentials(connectorType)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Google token refresh failed (${res.status}): ${err.error_description || err.error || 'unknown'}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  }
}

async function refreshMetaToken(credentials: Record<string, string>): Promise<RefreshResult> {
  // Meta uses long-lived token exchange — exchange existing token for a new one
  const res = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID || '',
      client_secret: process.env.META_APP_SECRET || '',
      fb_exchange_token: credentials.access_token,
    }),
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Meta token refresh failed (${res.status}): ${err.error?.message || 'unknown'}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    // Meta long-lived tokens last ~60 days
    expires_at: Date.now() + (data.expires_in || 5184000) * 1000,
  }
}

async function refreshLinkedInToken(credentials: Record<string, string>): Promise<RefreshResult> {
  if (!credentials.refresh_token) {
    throw new Error('No refresh_token — reconnection required')
  }

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${err.error_description || err.error || 'unknown'}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  }
}

// ===== Main refresh function =====

export async function refreshOAuthToken(
  connectorType: ConnectorType,
  credentials: Record<string, string>
): Promise<RefreshResult> {
  if (GOOGLE_CONNECTOR_TYPES.includes(connectorType)) {
    return refreshGoogleToken(connectorType, credentials)
  }
  if (connectorType === 'meta_ads' || connectorType === 'meta_api') {
    return refreshMetaToken(credentials)
  }
  if (connectorType === 'linkedin_api') {
    return refreshLinkedInToken(credentials)
  }
  throw new Error(`Unsupported connector type for token refresh: ${connectorType}`)
}

// ===== Persist refreshed tokens =====

export async function persistRefreshedTokens(
  connectorId: string,
  credentials: Record<string, string>,
  refreshResult: RefreshResult
): Promise<Record<string, string>> {
  const updatedCreds = {
    ...credentials,
    access_token: refreshResult.access_token,
    expires_at: String(refreshResult.expires_at),
  }

  const supabase = createServiceRoleClient()
  await supabase
    .from('connectors')
    .update({
      credentials_encrypted: encryptCredentials(updatedCreds),
      status: 'active',
      last_tested_at: new Date().toISOString(),
    })
    .eq('id', connectorId)

  return updatedCreds
}

// ===== Handle token error (disconnect + notify) =====

export async function handleTokenError(
  clientId: string,
  connectorType: ConnectorType,
  error: unknown
): Promise<void> {
  const supabase = createServiceRoleClient()
  const errorMsg = error instanceof Error ? error.message : 'Token refresh failed'

  // Mark connector as error/disconnected
  await supabase
    .from('connectors')
    .update({ status: 'error' })
    .eq('client_id', clientId)
    .eq('type', connectorType)

  // Get the user_id for the client
  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  if (!client?.user_id) return

  // Create a notification for the user
  const connectorLabels: Partial<Record<ConnectorType, string>> = {
    gmail: 'Gmail',
    google_ads: 'Google Ads',
    google_analytics: 'Google Analytics',
    meta_ads: 'Meta Ads',
    meta_api: 'Meta',
    linkedin_api: 'LinkedIn',
  }

  const label = connectorLabels[connectorType] || connectorType

  await supabase.from('team_notifications').insert({
    client_id: clientId,
    user_id: client.user_id,
    type: 'agent_alert' as const,
    title: `Connexion ${label} expirée`,
    body: `Votre connexion ${label} a expiré et doit être reconnectée. Rendez-vous dans Connecteurs pour rétablir la connexion. Détail : ${errorMsg}`,
    reference_type: 'connector',
    reference_id: connectorType,
    read: false,
  })
}

// ===== Utility: ensure valid token (refresh if needed) =====

export async function ensureValidToken(
  connectorId: string,
  connectorType: ConnectorType,
  clientId: string,
  credentials: Record<string, string>
): Promise<Record<string, string>> {
  if (!isTokenExpired(credentials)) {
    return credentials
  }

  try {
    const refreshResult = await refreshOAuthToken(connectorType, credentials)
    return await persistRefreshedTokens(connectorId, credentials, refreshResult)
  } catch (error) {
    await handleTokenError(clientId, connectorType, error)
    throw error
  }
}

// ===== Utility: wrap API call with auto-retry on 401 =====

export async function withTokenRefresh<T>(
  connectorId: string,
  connectorType: ConnectorType,
  clientId: string,
  credentials: Record<string, string>,
  apiCall: (creds: Record<string, string>) => Promise<T>
): Promise<T> {
  // First: ensure token is not expired before calling
  let creds = await ensureValidToken(connectorId, connectorType, clientId, credentials)

  try {
    return await apiCall(creds)
  } catch (error) {
    // On 401/auth error, try refreshing once
    const isAuthError =
      error instanceof Error &&
      (error.message.includes('401') ||
       error.message.includes('403') ||
       error.message.includes('Unauthorized') ||
       error.message.includes('token') ||
       error.message.includes('auth'))

    if (!isAuthError) throw error

    try {
      const refreshResult = await refreshOAuthToken(connectorType, creds)
      creds = await persistRefreshedTokens(connectorId, creds, refreshResult)
      return await apiCall(creds)
    } catch (refreshError) {
      await handleTokenError(clientId, connectorType, refreshError)
      throw refreshError
    }
  }
}
