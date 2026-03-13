/**
 * Gmail API integration
 * Used by Marc for email management
 */

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  subject: string
  from: string
  to: string
  date: string
  body: string
}

interface GmailSendPayload {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  replyToMessageId?: string
  threadId?: string
}

// ===== Auth helpers =====

async function getValidAccessToken(creds: Record<string, string>): Promise<string> {
  // If token is still valid, return it
  if (creds.access_token && creds.expires_at) {
    const expiresAt = parseInt(creds.expires_at)
    if (Date.now() < expiresAt - 60000) {
      return creds.access_token
    }
  }

  // Refresh the token
  if (!creds.refresh_token) {
    throw new Error('No refresh token available — reconnect Gmail')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${res.status}`)
  }

  const data = await res.json()
  return data.access_token
}

// ===== Reading emails =====

export async function listMessages(params: {
  creds: Record<string, string>
  query?: string
  maxResults?: number
  labelIds?: string[]
}): Promise<GmailMessage[]> {
  const { creds, query, maxResults = 20, labelIds } = params
  const token = await getValidAccessToken(creds)

  const qParams = new URLSearchParams({ maxResults: String(maxResults) })
  if (query) qParams.set('q', query)
  if (labelIds?.length) qParams.set('labelIds', labelIds.join(','))

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${qParams}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.status}`)

  const listData = await listRes.json()
  const messageIds: { id: string }[] = listData.messages || []

  // Fetch full message details (batch up to 10)
  const messages: GmailMessage[] = []
  for (const { id } of messageIds.slice(0, 10)) {
    const msg = await getMessage({ creds, messageId: id })
    if (msg) messages.push(msg)
  }

  return messages
}

export async function getMessage(params: {
  creds: Record<string, string>
  messageId: string
}): Promise<GmailMessage | null> {
  const { creds, messageId } = params
  const token = await getValidAccessToken(creds)

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) return null

  const data = await res.json()
  const headers = data.payload?.headers || []

  const getHeader = (name: string) =>
    headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  // Extract body text
  let body = ''
  if (data.payload?.body?.data) {
    body = Buffer.from(data.payload.body.data, 'base64url').toString('utf-8')
  } else if (data.payload?.parts) {
    const textPart = data.payload.parts.find((p: { mimeType: string }) => p.mimeType === 'text/plain')
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8')
    }
  }

  return {
    id: data.id,
    threadId: data.threadId,
    labelIds: data.labelIds || [],
    snippet: data.snippet || '',
    subject: getHeader('Subject'),
    from: getHeader('From'),
    to: getHeader('To'),
    date: getHeader('Date'),
    body: body.slice(0, 5000), // Limit body size
  }
}

// ===== Labels =====

export async function listLabels(creds: Record<string, string>): Promise<{ id: string; name: string; type: string }[]> {
  const token = await getValidAccessToken(creds)

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) throw new Error(`Gmail labels error: ${res.status}`)

  const data = await res.json()
  return (data.labels || []).map((l: { id: string; name: string; type: string }) => ({
    id: l.id,
    name: l.name,
    type: l.type,
  }))
}

export async function modifyLabels(params: {
  creds: Record<string, string>
  messageId: string
  addLabelIds?: string[]
  removeLabelIds?: string[]
}): Promise<void> {
  const { creds, messageId, addLabelIds = [], removeLabelIds = [] } = params
  const token = await getValidAccessToken(creds)

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    }
  )

  if (!res.ok) throw new Error(`Gmail modify error: ${res.status}`)
}

// ===== Sending =====

export async function sendEmail(params: {
  creds: Record<string, string>
  email: GmailSendPayload
}): Promise<{ id: string; threadId: string }> {
  const { creds, email } = params
  const token = await getValidAccessToken(creds)

  // Build RFC 2822 message
  const lines: string[] = [
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
  ]
  if (email.cc) lines.push(`Cc: ${email.cc}`)
  if (email.bcc) lines.push(`Bcc: ${email.bcc}`)
  if (email.replyToMessageId) {
    lines.push(`In-Reply-To: ${email.replyToMessageId}`)
    lines.push(`References: ${email.replyToMessageId}`)
  }
  lines.push('', email.body)

  const raw = Buffer.from(lines.join('\r\n')).toString('base64url')

  const body: Record<string, string> = { raw }
  if (email.threadId) body.threadId = email.threadId

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gmail send error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

// ===== Email categorization =====

export type EmailCategory = 'lead' | 'sav' | 'devis' | 'facture' | 'newsletter' | 'spam' | 'autre'

export function categorizeEmail(message: GmailMessage): EmailCategory {
  const text = `${message.subject} ${message.snippet}`.toLowerCase()

  if (/devis|tarif|prix|estimation|combien/.test(text)) return 'devis'
  if (/facture|paiement|reglement|avoir/.test(text)) return 'facture'
  if (/panne|reparation|sav|garantie|intervention|probleme|fuite|defaut/.test(text)) return 'sav'
  if (/newsletter|desinscri|unsubscribe/.test(text)) return 'newsletter'
  if (/intere|renseignement|information|projet|installation|pose/.test(text)) return 'lead'

  return 'autre'
}
