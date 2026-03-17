import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleOAuthCallback(request, {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
    redirectPath: '/api/connectors/gmail/callback',
    cookieName: 'gmail_oauth_state',
    connectorType: 'gmail',
    connectorName: 'Gmail',
    scopes: ['gmail.readonly', 'gmail.send', 'gmail.modify'],
  })
}
