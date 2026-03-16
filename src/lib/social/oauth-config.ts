import type { SocialPlatform } from '@/types/database'

export interface OAuthPlatformConfig {
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
  /** Additional auth params (e.g. PKCE, response_type) */
  extraAuthParams?: Record<string, string>
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export function getRedirectUri(platform: SocialPlatform): string {
  return `${APP_URL}/api/social/auth/${platform}/callback`
}

export const OAUTH_CONFIGS: Record<SocialPlatform, OAuthPlatformConfig> = {
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'pages_read_user_content',
      'public_profile',
    ],
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
  },

  instagram: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
      'public_profile',
    ],
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
  },

  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'w_member_social', 'r_basicprofile', 'r_organization_social'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  },

  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    extraAuthParams: {
      code_challenge_method: 'S256',
    },
  },

  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
  },

  google_ads: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/adwords', 'https://www.googleapis.com/auth/userinfo.profile'],
    clientIdEnv: 'GOOGLE_ADS_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_ADS_CLIENT_SECRET',
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
}

export function getOAuthConfig(platform: SocialPlatform): OAuthPlatformConfig & { clientId: string; clientSecret: string } {
  const config = OAUTH_CONFIGS[platform]
  const clientId = process.env[config.clientIdEnv] || ''
  const clientSecret = process.env[config.clientSecretEnv] || ''
  return { ...config, clientId, clientSecret }
}
