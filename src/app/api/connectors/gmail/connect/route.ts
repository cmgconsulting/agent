import { initiateOAuth } from '@/lib/connectors/oauth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return initiateOAuth({
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    redirectPath: '/api/connectors/gmail/callback',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    cookieName: 'gmail_oauth_state',
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  })
}
