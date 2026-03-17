import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleOAuthCallback(request, {
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    clientIdEnvVar: 'META_APP_ID',
    clientSecretEnvVar: 'META_APP_SECRET',
    redirectPath: '/api/connectors/meta-api/callback',
    cookieName: 'meta_oauth_state',
    connectorType: 'meta_api',
    connectorName: 'Meta (Facebook + Instagram)',
    scopes: ['pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
  })
}
