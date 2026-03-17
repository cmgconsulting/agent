import { initiateOAuth } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return initiateOAuth({
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientIdEnvVar: 'META_APP_ID',
    redirectPath: '/api/connectors/meta-api/callback',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
    ],
    cookieName: 'meta_oauth_state',
  })
}
