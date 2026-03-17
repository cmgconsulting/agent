import { initiateOAuth } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
  return initiateOAuth({
    authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    clientIdEnvVar: 'MICROSOFT_CLIENT_ID',
    redirectPath: '/api/connectors/outlook/callback',
    scopes: ['Mail.ReadWrite', 'Mail.Send', 'offline_access'],
    cookieName: 'outlook_oauth_state',
  })
}
