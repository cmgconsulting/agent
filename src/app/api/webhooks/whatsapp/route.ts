import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/vault'
import { parseWhatsAppWebhook, classifySAVRequest } from '@/lib/connectors/whatsapp'
import { runAgent } from '@/lib/agent-framework'
import { NextResponse } from 'next/server'

// GET — WhatsApp webhook verification
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token) {
    // Find connector with matching verify_token
    const supabase = createServiceRoleClient()
    const { data: connectors } = await supabase
      .from('connectors')
      .select('credentials_encrypted')
      .eq('type', 'whatsapp')
      .eq('status', 'active')

    for (const conn of connectors || []) {
      if (!conn.credentials_encrypted) continue
      try {
        const creds = decryptCredentials(conn.credentials_encrypted)
        if (creds.verify_token === token) {
          return new Response(challenge, { status: 200 })
        }
      } catch {
        continue
      }
    }
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — Receive incoming WhatsApp messages
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = parseWhatsAppWebhook(body)

    if (messages.length === 0) {
      return NextResponse.json({ received: true })
    }

    const supabase = createServiceRoleClient()

    for (const msg of messages) {
      // Find the connector matching this phone_number_id
      const { data: connectors } = await supabase
        .from('connectors')
        .select('*, clients(*)')
        .eq('type', 'whatsapp')
        .eq('status', 'active')

      let matchedClientId: string | null = null

      for (const conn of connectors || []) {
        if (!conn.credentials_encrypted) continue
        try {
          const creds = decryptCredentials(conn.credentials_encrypted)
          if (creds.phone_number_id === msg.phoneNumberId) {
            matchedClientId = conn.client_id
            break
          }
        } catch {
          continue
        }
      }

      if (!matchedClientId) continue

      // Classify the SAV request
      const classification = classifySAVRequest(msg.text)

      // Trigger Ludo agent with the incoming message
      try {
        await runAgent({
          clientId: matchedClientId,
          agentType: 'ludo',
          trigger: 'webhook',
          userMessage: `Nouveau message WhatsApp de ${msg.fromName} (${msg.from}):\n\n"${msg.text}"\n\nClassification automatique:\n- Categorie: ${classification.category}\n- Priorite: ${classification.priority}\n- Escalade necessaire: ${classification.needsEscalation ? 'OUI' : 'Non'}`,
          metadata: {
            whatsapp_message_id: msg.messageId,
            from_phone: msg.from,
            from_name: msg.fromName,
            classification,
          },
        })
      } catch (error) {
        console.error('Ludo agent run failed for WhatsApp message:', error)
        // Log the error but don't fail the webhook
        await supabase.from('agent_logs').insert({
          agent_id: (await supabase.from('agents').select('id').eq('client_id', matchedClientId).eq('type', 'ludo').single()).data?.id || null,
          client_id: matchedClientId,
          action: `WhatsApp message error: ${msg.from}`,
          status: 'error',
          payload_summary: error instanceof Error ? error.message : 'Unknown error',
          tokens_used: 0,
          duration_ms: 0,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
