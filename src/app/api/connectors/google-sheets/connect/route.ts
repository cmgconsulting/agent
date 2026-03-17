import { initiateOAuth } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return initiateOAuth({
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    redirectPath: '/api/connectors/google-sheets/callback',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
    cookieName: 'gsheets_oauth_state',
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  })
}
