import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptCredentials } from '@/lib/vault'
import type { ConnectorType } from '@/types/database'

export const dynamic = 'force-dynamic'
async function testGmailConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${credentials.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.emailAddress}` }
    }
    return { ok: false, message: 'Token invalide ou expire' }
  } catch {
    return { ok: false, message: 'Erreur de connexion Gmail' }
  }
}

async function testAirtableConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: { Authorization: `Bearer ${credentials.api_key}` },
    })
    if (res.ok) {
      const data = await res.json()
      const count = data.bases?.length || 0
      return { ok: true, message: `Connecte : ${count} base(s) trouvee(s)` }
    }
    return { ok: false, message: 'Cle API invalide' }
  } catch {
    return { ok: false, message: 'Erreur de connexion Airtable' }
  }
}

async function testMakeWebhook(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const url = credentials.webhook_url
    if (!url || !url.startsWith('https://')) {
      return { ok: false, message: 'URL webhook invalide' }
    }
    // Send a test ping to the webhook
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test', source: 'cmg_agents', timestamp: new Date().toISOString() }),
    })
    if (res.ok || res.status === 200) {
      return { ok: true, message: 'Webhook accessible et fonctionnel' }
    }
    return { ok: false, message: `Webhook a repondu avec le statut ${res.status}` }
  } catch {
    return { ok: false, message: 'Webhook inaccessible' }
  }
}

async function testBrevoConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': credentials.api_key },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.email || 'OK'}` }
    }
    return { ok: false, message: 'Cle API invalide' }
  } catch {
    return { ok: false, message: 'Erreur de connexion Brevo' }
  }
}

async function testNotionConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${credentials.api_key}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.name || 'Integration active'}` }
    }
    return { ok: false, message: 'Token invalide' }
  } catch {
    return { ok: false, message: 'Erreur de connexion Notion' }
  }
}

async function testPennylaneConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('https://app.pennylane.com/api/external/v1/company', {
      headers: { Authorization: `Bearer ${credentials.api_key}` },
    })
    if (res.ok) {
      return { ok: true, message: 'Connecte a Pennylane' }
    }
    return { ok: false, message: 'Cle API invalide' }
  } catch {
    return { ok: false, message: 'Erreur de connexion Pennylane' }
  }
}

async function testWhatsAppConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${credentials.phone_number_id}`,
      { headers: { Authorization: `Bearer ${credentials.access_token}` } }
    )
    if (res.ok) {
      return { ok: true, message: 'WhatsApp Business connecte' }
    }
    return { ok: false, message: 'Credentials invalides' }
  } catch {
    return { ok: false, message: 'Erreur de connexion WhatsApp' }
  }
}

async function testTwilioConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}.json`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64'),
        },
      }
    )
    if (res.ok) {
      return { ok: true, message: 'Twilio connecte' }
    }
    return { ok: false, message: 'Credentials invalides' }
  } catch {
    return { ok: false, message: 'Erreur de connexion Twilio' }
  }
}

const TEST_HANDLERS: Partial<Record<ConnectorType, (creds: Record<string, string>) => Promise<{ ok: boolean; message: string }>>> = {
  gmail: testGmailConnection,
  airtable: testAirtableConnection,
  make_com: testMakeWebhook,
  brevo: testBrevoConnection,
  notion: testNotionConnection,
  pennylane: testPennylaneConnection,
  whatsapp: testWhatsAppConnection,
  twilio: testTwilioConnection,
}

export async function POST(
  _request: Request,
  { params }: { params: { connectorId: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })

    const adminClient = createServiceRoleClient()

    // Get connector with encrypted credentials
    const { data: connector } = await adminClient
      .from('connectors')
      .select('*')
      .eq('id', params.connectorId)
      .single()

    if (!connector) return NextResponse.json({ error: 'Connecteur introuvable' }, { status: 404 })

    const connectorType = connector.type as ConnectorType
    const testHandler = TEST_HANDLERS[connectorType]

    if (!testHandler) {
      // No test handler for this connector type — mark as active
      await adminClient
        .from('connectors')
        .update({ status: 'active', last_tested_at: new Date().toISOString() })
        .eq('id', params.connectorId)

      return NextResponse.json({
        ok: true,
        message: 'Connecteur active (pas de test automatique disponible)',
      })
    }

    // Decrypt credentials and test
    let credentials: Record<string, string> = {}
    if (connector.credentials_encrypted) {
      credentials = decryptCredentials(connector.credentials_encrypted)
    }

    const result = await testHandler(credentials)

    // Update connector status
    await adminClient
      .from('connectors')
      .update({
        status: result.ok ? 'active' : 'error',
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', params.connectorId)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Error testing connector:', err)
    return NextResponse.json({ ok: false, message: 'Erreur serveur lors du test' }, { status: 500 })
  }
}
