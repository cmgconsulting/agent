import { decryptCredentials } from '@/lib/vault'
import type { AuthMethod } from '@/types/database'

// ============================================
// Build auth headers based on auth method
// ============================================

export function buildAuthHeaders(
  authMethod: AuthMethod,
  credentials: Record<string, string>
): Record<string, string> {
  switch (authMethod) {
    case 'api_key': {
      const headerName = credentials.header_name || 'X-API-Key'
      return { [headerName]: credentials.api_key || '' }
    }
    case 'bearer_token':
      return { Authorization: `Bearer ${credentials.token || ''}` }
    case 'basic_auth': {
      const encoded = Buffer.from(
        `${credentials.username || ''}:${credentials.password || ''}`
      ).toString('base64')
      return { Authorization: `Basic ${encoded}` }
    }
    case 'oauth2':
      return { Authorization: `Bearer ${credentials.access_token || ''}` }
    case 'none':
    default:
      return {}
  }
}

// ============================================
// Mask credentials in API responses
// ============================================

export function maskCredentials(
  credentials: Record<string, string> | null
): Record<string, string> | null {
  if (!credentials) return null
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string' && value.length > 4) {
      masked[key] = value.slice(0, 2) + '***' + value.slice(-2)
    } else {
      masked[key] = '***'
    }
  }
  return masked
}

// ============================================
// Safely decrypt credentials
// ============================================

export function safeDecryptCredentials(
  encrypted: string | null
): Record<string, string> {
  if (!encrypted) return {}
  try {
    return decryptCredentials(encrypted)
  } catch {
    return {}
  }
}

// ============================================
// Execute an API REST call
// ============================================

export async function executeApiRestCall(
  baseUrl: string,
  method: string,
  authMethod: AuthMethod,
  credentials: Record<string, string>,
  customHeaders: Record<string, string>,
  payload?: Record<string, unknown>
): Promise<{ status: number; data: unknown; ok: boolean }> {
  const authHeaders = buildAuthHeaders(authMethod, credentials)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
    ...authHeaders,
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30_000),
  }

  if (payload && method !== 'GET' && method !== 'DELETE') {
    fetchOptions.body = JSON.stringify(payload)
  }

  const res = await fetch(baseUrl, fetchOptions)

  let data: unknown
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  return { status: res.status, data, ok: res.ok }
}

// ============================================
// OAuth2 token refresh
// ============================================

export async function refreshOAuth2Token(
  credentials: Record<string, string>
): Promise<Record<string, string> | null> {
  const { refresh_token, token_url, client_id, client_secret } = credentials

  if (!refresh_token || !token_url) return null

  try {
    const res = await fetch(token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        ...(client_id ? { client_id } : {}),
        ...(client_secret ? { client_secret } : {}),
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      ...credentials,
      access_token: data.access_token,
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
      ...(data.expires_in
        ? { token_expires_at: String(Date.now() + data.expires_in * 1000) }
        : {}),
    }
  } catch {
    return null
  }
}
