import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/vault'
import { classifySAVRequest } from '@/lib/connectors/whatsapp'
import { runAgent } from '@/lib/agent-framework'


// POST — Receive incoming SMS via Twilio
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const messageSid = formData.get('MessageSid') as string

    if (!from || !body) {
      return new Response('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const supabase = createServiceRoleClient()

    // Find the connector matching this Twilio number
    const { data: connectors } = await supabase
      .from('connectors')
      .select('*')
      .eq('type', 'twilio')
      .eq('status', 'active')

    let matchedClientId: string | null = null

    for (const conn of connectors || []) {
      if (!conn.credentials_encrypted) continue
      try {
        const creds = decryptCredentials(conn.credentials_encrypted)
        if (creds.phone_number === to) {
          matchedClientId = conn.client_id
          break
        }
      } catch {
        continue
      }
    }

    if (!matchedClientId) {
      return new Response('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Classify the incoming SMS
    const classification = classifySAVRequest(body)

    // Trigger Ludo agent
    try {
      await runAgent({
        clientId: matchedClientId,
        agentType: 'ludo',
        trigger: 'webhook',
        userMessage: `Nouveau SMS de ${from}:\n\n"${body}"\n\nClassification automatique:\n- Categorie: ${classification.category}\n- Priorite: ${classification.priority}\n- Escalade necessaire: ${classification.needsEscalation ? 'OUI' : 'Non'}`,
        metadata: {
          sms_sid: messageSid,
          from_phone: from,
          channel: 'sms',
          classification,
        },
      })
    } catch (error) {
      console.error('Ludo agent run failed for SMS:', error)
    }

    // Return empty TwiML (Ludo will handle the response via pending_actions)
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return new Response('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
