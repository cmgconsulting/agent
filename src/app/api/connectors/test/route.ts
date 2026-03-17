import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decryptCredentials } from '@/lib/vault'
import type { ConnectorType } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) {
      return NextResponse.json({ error: 'Profil client introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const { connector_type } = body as { connector_type: ConnectorType }

    if (!connector_type) {
      return NextResponse.json({ error: 'Type de connecteur requis' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Get connector
    const { data: connector } = await adminClient
      .from('connectors')
      .select('*')
      .eq('client_id', profile.client_id)
      .eq('type', connector_type)
      .single()

    if (!connector) {
      return NextResponse.json({ error: 'Connecteur introuvable — sauvegardez d\'abord vos identifiants' }, { status: 404 })
    }

    // Decrypt credentials
    let credentials: Record<string, string> = {}
    if (connector.credentials_encrypted) {
      credentials = decryptCredentials(connector.credentials_encrypted)
    }

    // Run test
    const result = await testConnector(connector_type, credentials)

    // Update status
    await adminClient
      .from('connectors')
      .update({
        status: result.ok ? 'active' : 'error',
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', connector.id)

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: result.message })
  } catch (err) {
    console.error('Error testing connector:', err)
    return NextResponse.json({ error: 'Erreur serveur lors du test' }, { status: 500 })
  }
}

// ===== Test handlers =====

async function testConnector(
  type: ConnectorType,
  credentials: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  const handler = TEST_HANDLERS[type]
  if (!handler) {
    return { ok: true, message: 'Connexion active (pas de test automatique)' }
  }
  try {
    return await handler(credentials)
  } catch {
    return { ok: false, message: 'Erreur lors du test' }
  }
}

const TEST_HANDLERS: Partial<Record<ConnectorType, (creds: Record<string, string>) => Promise<{ ok: boolean; message: string }>>> = {
  gmail: async (creds) => {
    const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.emailAddress}` }
    }
    return { ok: false, message: 'Token Gmail invalide ou expire' }
  },

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
    return { ok: false, message: 'Cle API ou prefixe invalide' }
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
    return { ok: false, message: 'Token HubSpot invalide' }
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
      return { ok: true, message: `Connecte : ${data.name || 'OK'}` }
    }
    return { ok: false, message: 'Token Notion invalide' }
  },

  pennylane: async (creds) => {
    const res = await fetch('https://app.pennylane.com/api/external/v1/company', {
      headers: { Authorization: `Bearer ${creds.api_key}` },
    })
    if (res.ok) return { ok: true, message: 'Pennylane connecte' }
    return { ok: false, message: 'Cle API Pennylane invalide' }
  },

  meta_ads: async (creds) => {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${creds.ad_account_id}?fields=name&access_token=${creds.access_token}`
    )
    if (res.ok) {
      const data = await res.json()
      return { ok: true, message: `Connecte : ${data.name || 'Meta Ads'}` }
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
    return { ok: true, message: 'Webhook Make.com enregistre' }
  },

  google_ads: async (creds) => {
    if (creds.access_token) {
      const res = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + creds.access_token)
      if (res.ok) return { ok: true, message: 'Google Ads connecte' }
      return { ok: false, message: 'Token Google Ads expire' }
    }
    return { ok: true, message: 'Google Ads enregistre' }
  },

  google_analytics: async (creds) => {
    if (creds.access_token) {
      const res = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + creds.access_token)
      if (res.ok) return { ok: true, message: 'Google Analytics connecte' }
      return { ok: false, message: 'Token Google Analytics expire' }
    }
    return { ok: true, message: 'Google Analytics enregistre' }
  },

  linkedin_api: async (creds) => {
    if (creds.access_token) {
      const res = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      })
      if (res.ok) return { ok: true, message: 'LinkedIn connecte' }
      return { ok: false, message: 'Token LinkedIn expire' }
    }
    return { ok: true, message: 'LinkedIn enregistre' }
  },

  meta_api: async (creds) => {
    if (creds.access_token) {
      const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${creds.access_token}`)
      if (res.ok) return { ok: true, message: 'Meta connecte' }
      return { ok: false, message: 'Token Meta expire' }
    }
    return { ok: true, message: 'Meta enregistre' }
  },

  sellsy: async (creds) => {
    if (creds.client_id && creds.client_secret) {
      return { ok: true, message: 'Sellsy enregistre' }
    }
    return { ok: false, message: 'Client ID ou Secret manquant' }
  },

  canva: async (creds) => {
    if (creds.api_key && creds.api_key.length > 10) {
      return { ok: true, message: 'Canva enregistre' }
    }
    return { ok: false, message: 'Cle API trop courte' }
  },
}
