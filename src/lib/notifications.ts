import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/vault'
import type { ConnectorType } from '@/types/database'

interface NotificationPayload {
  clientId: string
  title: string
  message: string
  type: 'action_pending' | 'action_executed' | 'alert' | 'report'
  agentName?: string
}

export async function notifyClient(payload: NotificationPayload) {
  const supabase = createServiceRoleClient()

  // Get client info
  const { data: client } = await supabase
    .from('clients')
    .select('*, profiles!clients_user_id_fkey(*)')
    .eq('id', payload.clientId)
    .single()

  if (!client) return

  // Get active notification connectors
  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('client_id', payload.clientId)
    .eq('status', 'active')
    .in('type', ['gmail', 'brevo', 'twilio', 'whatsapp'] as ConnectorType[])

  const results: { channel: string; success: boolean; error?: string }[] = []

  for (const connector of connectors || []) {
    try {
      if (!connector.credentials_encrypted) continue
      const creds = decryptCredentials(connector.credentials_encrypted)

      switch (connector.type) {
        case 'brevo':
          await sendBrevoNotification(creds, client, payload)
          results.push({ channel: 'brevo', success: true })
          break
        case 'twilio':
          await sendTwilioSMS(creds, client, payload)
          results.push({ channel: 'twilio', success: true })
          break
        // Gmail and WhatsApp can be added later with full OAuth/API integration
        default:
          break
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      results.push({ channel: connector.type, success: false, error: msg })
    }
  }

  // Log notification attempt
  await supabase.from('agent_logs').insert({
    agent_id: (await supabase
      .from('agents')
      .select('id')
      .eq('client_id', payload.clientId)
      .eq('type', 'iris')
      .single()
    ).data?.id || null,
    client_id: payload.clientId,
    action: `Notification: ${payload.type} - ${payload.title}`,
    status: results.some(r => r.success) ? 'success' : 'warning',
    payload_summary: JSON.stringify({ channels: results }),
    tokens_used: 0,
    duration_ms: 0,
  })

  return results
}

async function sendBrevoNotification(
  creds: Record<string, string>,
  client: Record<string, unknown>,
  payload: NotificationPayload
) {
  const profile = client.profiles as Record<string, unknown> | null
  const email = (profile?.email as string) || ''
  if (!email) return

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': creds.api_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'CMG Agents', email: 'noreply@cmg-agents.fr' },
      to: [{ email, name: (profile?.full_name as string) || '' }],
      subject: `[CMG Agents] ${payload.agentName ? `${payload.agentName}: ` : ''}${payload.title}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">CMG Agents</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3>${payload.title}</h3>
            <p>${payload.message}</p>
            ${payload.type === 'action_pending' ? `
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
                   style="background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                  Voir dans le dashboard
                </a>
              </p>
            ` : ''}
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              ${payload.agentName ? `Agent: ${payload.agentName}` : 'CMG Agents'} · ${new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    throw new Error(`Brevo error: ${response.status}`)
  }
}

async function sendTwilioSMS(
  creds: Record<string, string>,
  client: Record<string, unknown>,
  payload: NotificationPayload
) {
  const phone = client.phone as string
  if (!phone) return

  const body = new URLSearchParams({
    To: phone,
    From: creds.phone_number,
    Body: `[CMG Agents] ${payload.agentName ? `${payload.agentName}: ` : ''}${payload.title}\n${payload.message}`,
  })

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  )

  if (!response.ok) {
    throw new Error(`Twilio error: ${response.status}`)
  }
}
