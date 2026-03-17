import { initiateOAuth } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return initiateOAuth({
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    clientIdEnvVar: 'QUICKBOOKS_CLIENT_ID',
    redirectPath: '/api/connectors/quickbooks/callback',
    scopes: ['com.intuit.quickbooks.accounting'],
    cookieName: 'qb_oauth_state',
  })
}
