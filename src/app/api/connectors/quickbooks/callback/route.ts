import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleOAuthCallback(request, {
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    clientIdEnvVar: 'QUICKBOOKS_CLIENT_ID',
    clientSecretEnvVar: 'QUICKBOOKS_CLIENT_SECRET',
    redirectPath: '/api/connectors/quickbooks/callback',
    cookieName: 'qb_oauth_state',
    connectorType: 'quickbooks',
    connectorName: 'QuickBooks',
    scopes: ['com.intuit.quickbooks.accounting'],
  })
}
