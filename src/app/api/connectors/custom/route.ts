import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/vault'
import { checkRateLimit, rateLimitResponse, sanitizeString, validateRequired } from '@/lib/security'
import { safeDecryptCredentials, maskCredentials } from '@/lib/connectors/custom-connector-utils'

export const dynamic = 'force-dynamic'
// ============================================
// GET — List custom connectors for client
// ============================================

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const { data: connectors } = await supabase
      .from('custom_connectors')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    // Mask credentials in response
    const safeConnectors = (connectors || []).map(c => ({
      ...c,
      credentials_encrypted: undefined,
      credentials_masked: maskCredentials(safeDecryptCredentials(c.credentials_encrypted)),
    }))

    return NextResponse.json({ connectors: safeConnectors })
  } catch (err) {
    console.error('Error listing custom connectors:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// POST — Create a custom connector
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit(`custom-connector-create`, { maxRequests: 20, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetIn)

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const body = await request.json()
    const missing = validateRequired(body, ['name', 'connector_type'])
    if (missing) return NextResponse.json({ error: missing }, { status: 400 })

    const { name, description, connector_type, base_url, http_method, auth_method, credentials, custom_headers, mcp_config } = body

    if (!['api_rest', 'mcp'].includes(connector_type)) {
      return NextResponse.json({ error: 'Type invalide: api_rest ou mcp' }, { status: 400 })
    }

    if (connector_type === 'api_rest' && !base_url) {
      return NextResponse.json({ error: 'URL de base requise pour API REST' }, { status: 400 })
    }

    if (connector_type === 'mcp' && (!mcp_config || !mcp_config.server_url)) {
      return NextResponse.json({ error: 'URL du serveur MCP requise' }, { status: 400 })
    }

    // Encrypt credentials if provided
    let credentialsEncrypted: string | null = null
    if (credentials && typeof credentials === 'object' && Object.keys(credentials).length > 0) {
      credentialsEncrypted = encryptCredentials(credentials)
    }

    const adminClient = createServiceRoleClient()
    const { data: connector, error } = await adminClient
      .from('custom_connectors')
      .insert({
        client_id: client.id,
        name: sanitizeString(name, 100),
        description: description ? sanitizeString(description, 500) : null,
        connector_type,
        base_url: base_url ? sanitizeString(base_url, 2000) : null,
        http_method: http_method || 'GET',
        auth_method: auth_method || 'none',
        credentials_encrypted: credentialsEncrypted,
        custom_headers: custom_headers || {},
        mcp_config: connector_type === 'mcp' ? (mcp_config || {}) : {},
        status: 'inactive',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom connector:', error)
      return NextResponse.json({ error: 'Erreur lors de la creation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      connector: {
        ...connector,
        credentials_encrypted: undefined,
        credentials_masked: maskCredentials(credentials || null),
      },
    }, { status: 201 })
  } catch (err) {
    console.error('Error creating custom connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
