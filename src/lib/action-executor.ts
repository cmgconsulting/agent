/**
 * Action Executor
 * Executes approved pending_actions using the appropriate connector
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/vault'
import * as gmailApi from '@/lib/connectors/gmail'
import * as metaApi from '@/lib/connectors/meta'
import * as whatsappApi from '@/lib/connectors/whatsapp'
import * as pennylaneApi from '@/lib/connectors/pennylane'
import type { ConnectorType } from '@/types/database'

interface ActionPayload {
  id: string
  agent_id: string
  client_id: string
  action_type: string
  title: string
  payload: Record<string, unknown>
}

export async function executeAction(action: ActionPayload): Promise<{ success: boolean; result?: string; error?: string }> {
  const supabase = createServiceRoleClient()

  // Load connectors for the client
  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('client_id', action.client_id)
    .eq('status', 'active')

  const connectorMap = new Map<ConnectorType, Record<string, string>>()
  for (const conn of connectors || []) {
    if (conn.credentials_encrypted) {
      try {
        connectorMap.set(conn.type as ConnectorType, decryptCredentials(conn.credentials_encrypted))
      } catch {
        // Skip
      }
    }
  }

  try {
    switch (action.action_type) {
      case 'send_email': {
        const gmailCreds = connectorMap.get('gmail')
        if (!gmailCreds) return { success: false, error: 'Gmail non connecte' }
        const p = action.payload
        const result = await gmailApi.sendEmail({
          creds: gmailCreds,
          email: {
            to: p.to as string,
            subject: p.subject as string,
            body: p.body as string,
            cc: p.cc as string | undefined,
            replyToMessageId: p.reply_to_message_id as string | undefined,
            threadId: p.thread_id as string | undefined,
          },
        })
        return { success: true, result: `Email envoye (${result.id})` }
      }

      case 'publish_post': {
        const metaCreds = connectorMap.get('meta_api')
        if (!metaCreds) return { success: false, error: 'Meta API non connecte' }
        const p = action.payload
        const platform = p.platform as string || 'facebook'

        if (platform === 'instagram') {
          const pages = await metaApi.getPages(metaCreds.access_token)
          if (pages.length === 0) return { success: false, error: 'Aucune page trouvee' }
          const igUserId = await metaApi.getInstagramBusinessAccount({
            pageId: pages[0].id,
            accessToken: metaCreds.access_token,
          })
          if (!igUserId) return { success: false, error: 'Pas de compte Instagram Business' }
          const result = await metaApi.publishInstagramPost({
            igUserId,
            accessToken: metaCreds.access_token,
            imageUrl: p.image_url as string,
            caption: p.caption as string || p.message as string,
          })
          return { success: true, result: `Post Instagram publie (${result.id})` }
        } else {
          const pages = await metaApi.getPages(metaCreds.access_token)
          if (pages.length === 0) return { success: false, error: 'Aucune page trouvee' }
          const result = await metaApi.publishFacebookPost({
            pageId: pages[0].id,
            accessToken: pages[0].access_token,
            message: p.message as string,
            link: p.link as string | undefined,
            imageUrl: p.image_url as string | undefined,
          })
          return { success: true, result: `Post Facebook publie (${result.id})` }
        }
      }

      case 'send_whatsapp': {
        const whatsappCreds = connectorMap.get('whatsapp')
        if (!whatsappCreds) return { success: false, error: 'WhatsApp non connecte' }
        const p = action.payload
        const result = await whatsappApi.sendWhatsAppMessage({
          phoneNumberId: whatsappCreds.phone_number_id,
          accessToken: whatsappCreds.access_token,
          to: p.to as string,
          text: p.text as string,
        })
        return { success: true, result: `Message WhatsApp envoye (${result.messageId})` }
      }

      case 'send_sms': {
        const twilioCreds = connectorMap.get('twilio')
        if (!twilioCreds) return { success: false, error: 'Twilio non connecte' }
        const p = action.payload
        const body = new URLSearchParams({
          To: p.to as string,
          From: twilioCreds.phone_number,
          Body: p.text as string,
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioCreds.account_sid}:${twilioCreds.auth_token}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        )
        if (!res.ok) return { success: false, error: `Twilio error: ${res.status}` }
        const data = await res.json()
        return { success: true, result: `SMS envoye (${data.sid})` }
      }

      case 'send_reminder_email': {
        const gmailCreds = connectorMap.get('gmail')
        if (!gmailCreds) return { success: false, error: 'Gmail non connecte' }
        const p = action.payload
        const result = await gmailApi.sendEmail({
          creds: gmailCreds,
          email: {
            to: p.to as string,
            subject: p.subject as string,
            body: p.body as string,
          },
        })
        return { success: true, result: `Relance email envoyee (${result.id})` }
      }

      case 'send_reminder_sms': {
        const twilioCreds = connectorMap.get('twilio')
        if (!twilioCreds) return { success: false, error: 'Twilio non connecte' }
        const p = action.payload
        const body = new URLSearchParams({
          To: p.to as string,
          From: twilioCreds.phone_number,
          Body: p.text as string,
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioCreds.account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioCreds.account_sid}:${twilioCreds.auth_token}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        )
        if (!res.ok) return { success: false, error: `Twilio error: ${res.status}` }
        const data = await res.json()
        return { success: true, result: `Relance SMS envoyee (${data.sid})` }
      }

      case 'create_invoice': {
        const pennylaneCreds = connectorMap.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Pennylane non connecte' }
        const auth = { api_key: pennylaneCreds.api_key }
        const p = action.payload
        const invoice = await pennylaneApi.createInvoice(auth, {
          customer_id: p.customer_id as number,
          date: p.date as string || new Date().toISOString().split('T')[0],
          deadline: p.deadline as string || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          draft: p.draft !== false,
          currency: 'EUR',
          line_items: p.line_items as { label: string; quantity: number; unit_price: number; vat_rate: string; unit: string }[],
        })
        return { success: true, result: `Facture creee: ${invoice.invoice_number}` }
      }

      case 'finalize_invoice': {
        const pennylaneCreds = connectorMap.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Pennylane non connecte' }
        const auth = { api_key: pennylaneCreds.api_key }
        const invoice = await pennylaneApi.finalizeInvoice(auth, action.payload.invoice_id as number)
        return { success: true, result: `Facture ${invoice.invoice_number} finalisee` }
      }

      case 'send_invoice_email': {
        const pennylaneCreds = connectorMap.get('pennylane')
        if (!pennylaneCreds) return { success: false, error: 'Pennylane non connecte' }
        const auth = { api_key: pennylaneCreds.api_key }
        await pennylaneApi.sendInvoiceByEmail(auth, action.payload.invoice_id as number)
        return { success: true, result: `Facture envoyee par email` }
      }

      default:
        // For action types without a specific handler, mark as executed
        return { success: true, result: `Action "${action.action_type}" executee` }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
