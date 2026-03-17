import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleOAuthCallback(request, {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
    redirectPath: '/api/connectors/google-docs/callback',
    cookieName: 'gdocs_oauth_state',
    connectorType: 'google_docs',
    connectorName: 'Google Docs',
    scopes: ['documents', 'drive'],
  })
}
