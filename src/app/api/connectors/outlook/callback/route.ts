import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
  return handleOAuthCallback(request, {
    tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    clientIdEnvVar: 'MICROSOFT_CLIENT_ID',
    clientSecretEnvVar: 'MICROSOFT_CLIENT_SECRET',
    redirectPath: '/api/connectors/outlook/callback',
    cookieName: 'outlook_oauth_state',
    connectorType: 'outlook',
    connectorName: 'Outlook',
    scopes: ['Mail.ReadWrite', 'Mail.Send'],
  })
}
