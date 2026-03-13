/**
 * WhatsApp Business API integration
 * Used by Ludo for SAV client communication
 */

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  text?: { body: string }
  image?: { id: string; caption?: string }
}

interface WhatsAppWebhookEntry {
  id: string
  changes: {
    value: {
      messaging_product: string
      metadata: { display_phone_number: string; phone_number_id: string }
      contacts?: { profile: { name: string }; wa_id: string }[]
      messages?: WhatsAppMessage[]
      statuses?: { id: string; status: string; timestamp: string }[]
    }
    field: string
  }[]
}

export interface ParsedWhatsAppMessage {
  messageId: string
  from: string
  fromName: string
  timestamp: string
  text: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  phoneNumberId: string
}

// ===== Sending messages =====

export async function sendWhatsAppMessage(params: {
  phoneNumberId: string
  accessToken: string
  to: string
  text: string
}): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken, to, text } = params

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`WhatsApp send error: ${err.error?.message || res.status}`)
  }

  const data = await res.json()
  return { messageId: data.messages?.[0]?.id || '' }
}

export async function sendWhatsAppTemplate(params: {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  languageCode?: string
  parameters?: string[]
}): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken, to, templateName, languageCode = 'fr', parameters = [] } = params

  const components = parameters.length > 0
    ? [{
        type: 'body',
        parameters: parameters.map(p => ({ type: 'text', text: p })),
      }]
    : undefined

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`WhatsApp template error: ${err.error?.message || res.status}`)
  }

  const data = await res.json()
  return { messageId: data.messages?.[0]?.id || '' }
}

export async function markMessageAsRead(params: {
  phoneNumberId: string
  accessToken: string
  messageId: string
}): Promise<void> {
  const { phoneNumberId, accessToken, messageId } = params

  await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    }
  )
}

// ===== Webhook parsing =====

export function parseWhatsAppWebhook(body: { entry?: WhatsAppWebhookEntry[] }): ParsedWhatsAppMessage[] {
  const messages: ParsedWhatsAppMessage[] = []

  for (const entry of body.entry || []) {
    for (const change of entry.changes) {
      const value = change.value
      if (!value.messages) continue

      for (const msg of value.messages) {
        const contact = value.contacts?.find(c => c.wa_id === msg.from)
        messages.push({
          messageId: msg.id,
          from: msg.from,
          fromName: contact?.profile?.name || msg.from,
          timestamp: msg.timestamp,
          text: msg.text?.body || msg.image?.caption || '[media]',
          type: msg.type,
          phoneNumberId: value.metadata.phone_number_id,
        })
      }
    }
  }

  return messages
}

// ===== SAV classification =====

export type SAVCategory = 'panne' | 'installation' | 'garantie' | 'reclamation' | 'information' | 'rdv' | 'autre'
export type SAVPriority = 'urgent' | 'high' | 'normal' | 'low'

export function classifySAVRequest(text: string): { category: SAVCategory; priority: SAVPriority; needsEscalation: boolean } {
  const lower = text.toLowerCase()

  // Priority detection
  let priority: SAVPriority = 'normal'
  if (/urgent|danger|fuite|incendie|electri|gaz|securite|immedia/.test(lower)) {
    priority = 'urgent'
  } else if (/panne|ne fonctionne|en panne|casse|bloque/.test(lower)) {
    priority = 'high'
  } else if (/info|question|renseign|horaire/.test(lower)) {
    priority = 'low'
  }

  // Category detection
  let category: SAVCategory = 'autre'
  if (/panne|defaut|ne fonctionne|arret|erreur|dysfonctionnement/.test(lower)) {
    category = 'panne'
  } else if (/install|pose|mise en service|livraison|chantier/.test(lower)) {
    category = 'installation'
  } else if (/garantie|remplacement|echange|defectueux/.test(lower)) {
    category = 'garantie'
  } else if (/reclam|plainte|mecontentement|remboursement|litige/.test(lower)) {
    category = 'reclamation'
  } else if (/rdv|rendez-vous|disponibilite|creneau|planifier/.test(lower)) {
    category = 'rdv'
  } else if (/info|renseign|question|comment|tarif/.test(lower)) {
    category = 'information'
  }

  const needsEscalation = priority === 'urgent' || category === 'reclamation'

  return { category, priority, needsEscalation }
}
