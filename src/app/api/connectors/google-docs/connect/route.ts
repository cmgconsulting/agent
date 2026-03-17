import { initiateOAuth } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return initiateOAuth({
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    redirectPath: '/api/connectors/google-docs/callback',
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ],
    cookieName: 'gdocs_oauth_state',
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  })
}
