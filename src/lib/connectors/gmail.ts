/**
 * Gmail API integration
 * Used by Marc for email management
 */

import { isTokenExpired, refreshOAuthToken, persistRefreshedTokens, handleTokenError, withTokenRefresh } from './token-refresh'

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

// Context for token refresh (set by caller via setGmailContext)
let _connectorId = ''
let _clientId = ''

export function setGmailContext(connectorId: string, clientId: string) {
  _connectorId = connectorId
  _clientId = clientId
}

// ===== Auth helpers =====

let _currentCreds: Record<string, string> = {}

async function getValidAccessToken(creds: Record<string, string>): Promise<string> {
  _currentCreds = creds

  if (!isTokenExpired(creds)) {
    return creds.access_token
  }

  // Refresh the token
  try {
    const result = await refreshOAuthToken('gmail', creds)
    const updated = await persistRefreshedTokens(_connectorId, creds, result)
    _currentCreds = updated
    return updated.access_token
  } catch (error) {
    await handleTokenError(_clientId, 'gmail', error)
    throw error
  }
}

// ===== Reading emails =====

export async function listMessages(params: {
  creds: Record<string, string>
  query?: string
  maxResults?: number
  labelIds?: string[]
}): Promise<GmailMessage[]> {
  const { creds, query, maxResults = 20, labelIds } = params

  async function doList(c: Record<string, string>): Promise<GmailMessage[]> {
    const token = await getValidAccessToken(c)
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

    const messages: GmailMessage[] = []
    for (const { id } of messageIds.slice(0, 10)) {
      const msg = await getMessage({ creds: _currentCreds, messageId: id })
      if (msg) messages.push(msg)
    }
    return messages
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'gmail', _clientId, creds, doList)
  }
  return doList(creds)
}

export async function getMessage(params: {
  creds: Record<string, string>
  messageId: string
}): Promise<GmailMessage | null> {
  const { creds, messageId } = params

  async function doGet(c: Record<string, string>): Promise<GmailMessage | null> {
    const token = await getValidAccessToken(c)
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error(`Gmail auth error: ${res.status}`)
      return null
    }
    return parseGmailMessage(await res.json())
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'gmail', _clientId, creds, doGet)
  }
  return doGet(creds)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGmailMessage(data: any): GmailMessage {
  const headers = data.payload?.headers || []

  const getHeader = (name: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

  // Extract body text
  let body = ''
  if (data.payload?.body?.data) {
    body = Buffer.from(data.payload.body.data, 'base64url').toString('utf-8')
  } else if (data.payload?.parts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain')
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
    body: body.slice(0, 5000),
  }
}

// ===== Labels =====

export async function listLabels(creds: Record<string, string>): Promise<{ id: string; name: string; type: string }[]> {
  async function doList(c: Record<string, string>) {
    const token = await getValidAccessToken(c)
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Gmail labels error: ${res.status}`)
    const data = await res.json()
    return (data.labels || []).map((l: { id: string; name: string; type: string }) => ({
      id: l.id, name: l.name, type: l.type,
    }))
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'gmail', _clientId, creds, doList)
  }
  return doList(creds)
}

export async function modifyLabels(params: {
  creds: Record<string, string>
  messageId: string
  addLabelIds?: string[]
  removeLabelIds?: string[]
}): Promise<void> {
  const { creds, messageId, addLabelIds = [], removeLabelIds = [] } = params

  async function doModify(c: Record<string, string>) {
    const token = await getValidAccessToken(c)
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addLabelIds, removeLabelIds }),
      }
    )
    if (!res.ok) throw new Error(`Gmail modify error: ${res.status}`)
  }

  if (_connectorId && _clientId) {
    await withTokenRefresh(_connectorId, 'gmail', _clientId, creds, doModify)
  } else {
    await doModify(creds)
  }
}

// ===== Sending =====

export async function sendEmail(params: {
  creds: Record<string, string>
  email: GmailSendPayload
}): Promise<{ id: string; threadId: string }> {
  const { creds, email } = params

  async function doSend(c: Record<string, string>): Promise<{ id: string; threadId: string }> {
    const token = await getValidAccessToken(c)

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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Gmail send error: ${err.error?.message || res.status}`)
    }
    return res.json()
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'gmail', _clientId, creds, doSend)
  }
  return doSend(creds)
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
