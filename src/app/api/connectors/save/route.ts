import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/vault'
import type { ConnectorType } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Get client_id from clients table
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client?.id) {
      return NextResponse.json({ error: 'Profil client introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const { connector_type, credentials } = body as {
      connector_type: ConnectorType
      credentials: Record<string, string>
    }

    if (!connector_type) {
      return NextResponse.json({ error: 'Type de connecteur requis' }, { status: 400 })
    }

    if (!credentials || Object.keys(credentials).length === 0) {
      return NextResponse.json({ error: 'Identifiants requis' }, { status: 400 })
    }

    // Check that no required field is empty
    const emptyFields = Object.entries(credentials).filter(([, v]) => !v?.trim())
    if (emptyFields.length > 0) {
      return NextResponse.json({
        error: `Champs manquants : ${emptyFields.map(([k]) => k).join(', ')}`
      }, { status: 400 })
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials)

    const adminClient = createServiceRoleClient()

    // Upsert: update if exists, create if not
    const { data: existing } = await adminClient
      .from('connectors')
      .select('id')
      .eq('client_id', client.id)
      .eq('type', connector_type)
      .single()

    if (existing) {
      // Update existing connector
      const { error } = await adminClient
        .from('connectors')
        .update({
          credentials_encrypted: encryptedCredentials,
          status: 'inactive', // Will become active after test
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating connector:', error)
        return NextResponse.json({ error: 'Erreur lors de la mise a jour' }, { status: 500 })
      }
    } else {
      // Create new connector
      const { error } = await adminClient
        .from('connectors')
        .insert({
          client_id: client.id,
          type: connector_type,
          credentials_encrypted: encryptedCredentials,
          status: 'inactive',
          config: {},
        })

      if (error) {
        console.error('Error creating connector:', error)
        return NextResponse.json({ error: 'Erreur lors de la creation' }, { status: 500 })
      }
    }

    // Now auto-test the connection
    const testResult = await testConnectorCredentials(connector_type, credentials)

    // Update status based on test result
    await adminClient
      .from('connectors')
      .update({
        status: testResult.ok ? 'active' : 'inactive',
        last_tested_at: new Date().toISOString(),
      })
      .eq('client_id', client.id)
      .eq('type', connector_type)

    return NextResponse.json({
      success: true,
      tested: true,
      test_ok: testResult.ok,
      message: testResult.message,
    })
  } catch (err) {
    console.error('Error saving connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ===== Inline test handlers (reused from admin test route) =====

async function testConnectorCredentials(
  type: ConnectorType,
  credentials: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  const handler = TEST_HANDLERS[type]
  if (!handler) {
    // No test available — assume OK
    return { ok: true, message: 'Connecteur enregistre (pas de test automatique)' }
  }
  try {
    return await handler(credentials)
  } catch {
    return { ok: false, message: 'Erreur lors du test de connexion' }
  }
}

const TEST_HANDLERS: Partial<Record<ConnectorType, (creds: Record<string, string>) => Promise<{ ok: boolean; message: string }>>> = {
  brevo: async (creds) => {
    const res = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': creds.api_key },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.email || 'OK'}` }
    }
    return { ok: false, message: 'Cle API Brevo invalide' }
  },

  mailchimp: async (creds) => {
    const res = await fetch(`https://${creds.server_prefix}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: `Bearer ${creds.api_key}` },
    })
    if (res.ok) return { ok: true, message: 'Mailchimp connecte' }
    return { ok: false, message: 'Cle API ou prefixe serveur invalide' }
  },

  airtable: async (creds) => {
    const res = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: { Authorization: `Bearer ${creds.api_key}` },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.bases?.length || 0} base(s)` }
    }
    return { ok: false, message: 'Token Airtable invalide' }
  },

  hubspot: async (creds) => {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    })
    if (res.ok) return { ok: true, message: 'HubSpot connecte' }
    return { ok: false, message: 'Access Token HubSpot invalide' }
  },

  notion: async (creds) => {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${creds.api_key}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.name || 'Integration active'}` }
    }
    return { ok: false, message: 'Token Notion invalide' }
  },

  canva: async (creds) => {
    // Canva API basic check
    if (creds.api_key && creds.api_key.length > 10) {
      return { ok: true, message: 'Cle API Canva enregistree' }
    }
    return { ok: false, message: 'Cle API Canva invalide' }
  },

  pennylane: async (creds) => {
    const res = await fetch('https://app.pennylane.com/api/external/v1/company', {
      headers: { Authorization: `Bearer ${creds.api_key}` },
    })
    if (res.ok) return { ok: true, message: 'Pennylane connecte' }
    return { ok: false, message: 'Cle API Pennylane invalide' }
  },

  sellsy: async (creds) => {
    // Sellsy uses client_id + client_secret for OAuth2 client_credentials
    if (creds.client_id && creds.client_secret) {
      return { ok: true, message: 'Identifiants Sellsy enregistres' }
    }
    return { ok: false, message: 'Client ID ou Secret manquant' }
  },

  meta_ads: async (creds) => {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${creds.ad_account_id}?fields=name&access_token=${creds.access_token}`
    )
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.name || 'Compte Meta Ads'}` }
    }
    return { ok: false, message: 'Token ou Ad Account ID invalide' }
  },

  whatsapp: async (creds) => {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${creds.phone_number_id}`,
      { headers: { Authorization: `Bearer ${creds.access_token}` } }
    )
    if (res.ok) return { ok: true, message: 'WhatsApp Business connecte' }
    return { ok: false, message: 'Credentials WhatsApp invalides' }
  },

  twilio: async (creds) => {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}.json`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString('base64'),
        },
      }
    )
    if (res.ok) return { ok: true, message: 'Twilio connecte' }
    return { ok: false, message: 'Credentials Twilio invalides' }
  },

  make_com: async (creds) => {
    if (!creds.webhook_url?.startsWith('https://')) {
      return { ok: false, message: 'URL webhook invalide' }
    }
    try {
      const res = await fetch(creds.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', source: 'cmg_agents', timestamp: new Date().toISOString() }),
      })
      if (res.ok) return { ok: true, message: 'Webhook Make.com fonctionnel' }
      return { ok: false, message: `Webhook a repondu ${res.status}` }
    } catch {
      return { ok: false, message: 'Webhook inaccessible' }
    }
  },
}
