import type { SocialPlatform } from '@/types/database'
import { getOAuthConfig, getRedirectUri } from './oauth-config'
import { generatePKCE } from './oauth-pkce'

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
}

export interface OAuthState {
  platform: SocialPlatform
  clientId: string
  codeVerifier?: string // For PKCE (Twitter)
}

/**
 * Build the OAuth authorization URL for a given platform
 */
export function buildAuthUrl(platform: SocialPlatform, state: string): { url: string; codeVerifier?: string } {
  const config = getOAuthConfig(platform)
  const redirectUri = getRedirectUri(platform)
  const params = new URLSearchParams({
    client_id: platform === 'tiktok' ? config.clientId : config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  })

  // Platform-specific param names
  if (platform === 'tiktok') {
    params.set('client_key', config.clientId)
    params.delete('client_id')
  }

  // Add scopes
  if (platform === 'tiktok') {
    params.set('scope', config.scopes.join(','))
  } else {
    params.set('scope', config.scopes.join(' '))
  }

  // Add extra auth params
  if (config.extraAuthParams) {
    for (const [key, value] of Object.entries(config.extraAuthParams)) {
      params.set(key, value)
    }
  }

  // Handle PKCE for Twitter
  let codeVerifier: string | undefined
  if (platform === 'twitter') {
    const pkce = generatePKCE()
    codeVerifier = pkce.codeVerifier
    params.set('code_challenge', pkce.codeChallenge)
  }

  return {
    url: `${config.authUrl}?${params.toString()}`,
    codeVerifier,
  }
}

/**
 * Exchange an authorization code for access/refresh tokens
 */
export async function exchangeCodeForTokens(
  platform: SocialPlatform,
  code: string,
  codeVerifier?: string
): Promise<OAuthTokens> {
  const config = getOAuthConfig(platform)
  const redirectUri = getRedirectUri(platform)

  const body: Record<string, string> = {
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }

  // Platform-specific token exchange
  if (platform === 'tiktok') {
    body.client_key = config.clientId
    body.client_secret = config.clientSecret
  } else if (platform === 'twitter') {
    body.client_id = config.clientId
    if (codeVerifier) body.code_verifier = codeVerifier
  } else {
    body.client_id = config.clientId
    body.client_secret = config.clientSecret
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  // Twitter uses Basic Auth for client credentials
  if (platform === 'twitter') {
    headers['Authorization'] = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OAuth token exchange failed for ${platform}: ${res.status} ${errorText}`)
  }

  const data = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  }
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  platform: SocialPlatform,
  refreshToken: string
): Promise<OAuthTokens> {
  const config = getOAuthConfig(platform)

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (platform === 'tiktok') {
    body.client_key = config.clientId
    body.client_secret = config.clientSecret
  } else if (platform === 'twitter') {
    body.client_id = config.clientId
    headers['Authorization'] = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
  } else {
    body.client_id = config.clientId
    body.client_secret = config.clientSecret
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OAuth token refresh failed for ${platform}: ${res.status} ${errorText}`)
  }

  const data = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  }
}

/**
 * Fetch user profile from a platform after OAuth
 */
export async function fetchUserProfile(platform: SocialPlatform, accessToken: string): Promise<{
  userId: string
  username?: string
  displayName?: string
  profileImageUrl?: string
  pageId?: string
  pageName?: string
}> {
  switch (platform) {
    case 'facebook': {
      // Get user info + pages
      const userRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${accessToken}`)
      if (!userRes.ok) throw new Error('Failed to fetch Facebook user profile')
      const user = await userRes.json()

      // Get pages
      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`)
      const pagesData = pagesRes.ok ? await pagesRes.json() : { data: [] }
      const page = pagesData.data?.[0]

      return {
        userId: user.id,
        displayName: user.name,
        profileImageUrl: user.picture?.data?.url,
        pageId: page?.id,
        pageName: page?.name,
      }
    }

    case 'instagram': {
      // Get user + pages + IG business account
      const userRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`)
      if (!userRes.ok) throw new Error('Failed to fetch Instagram user profile')
      const user = await userRes.json()

      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`)
      const pagesData = pagesRes.ok ? await pagesRes.json() : { data: [] }
      const page = pagesData.data?.[0]
      const igAccount = page?.instagram_business_account

      return {
        userId: igAccount?.id || user.id,
        username: igAccount?.username,
        displayName: user.name,
        profileImageUrl: igAccount?.profile_picture_url,
        pageId: page?.id,
        pageName: page?.name,
      }
    }

    case 'linkedin': {
      const res = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to fetch LinkedIn profile')
      const data = await res.json()
      return {
        userId: data.sub,
        displayName: data.name,
        profileImageUrl: data.picture,
      }
    }

    case 'twitter': {
      const res = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,username', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to fetch Twitter profile')
      const data = await res.json()
      return {
        userId: data.data.id,
        username: data.data.username,
        displayName: data.data.name,
        profileImageUrl: data.data.profile_image_url,
      }
    }

    case 'tiktok': {
      const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,union_id', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to fetch TikTok profile')
      const data = await res.json()
      const user = data.data?.user
      return {
        userId: user?.open_id || user?.union_id || '',
        displayName: user?.display_name,
        profileImageUrl: user?.avatar_url,
      }
    }

    case 'google_ads': {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Failed to fetch Google profile')
      const data = await res.json()
      return {
        userId: data.id,
        displayName: data.name,
        profileImageUrl: data.picture,
      }
    }
  }
}
