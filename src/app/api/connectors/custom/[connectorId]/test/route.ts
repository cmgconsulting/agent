import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { safeDecryptCredentials, executeApiRestCall } from '@/lib/connectors/custom-connector-utils'
import { testMcpConnection } from '@/lib/connectors/mcp-client'

export async function POST(
  _request: Request,
  { params }: { params: { connectorId: string } }
) {
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const adminClient = createServiceRoleClient()
    const { data: connector } = await adminClient
      .from('custom_connectors')
      .select('*')
      .eq('id', params.connectorId)
      .single()

    if (!connector) return NextResponse.json({ error: 'Connecteur introuvable' }, { status: 404 })

    if (connector.client_id !== client.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    let testResult: { ok: boolean; message: string; tools?: unknown[] }

    if (connector.connector_type === 'mcp') {
      // MCP: test connection + list tools
      const mcpConfig = connector.mcp_config as { server_url?: string } | null
      if (!mcpConfig?.server_url) {
        return NextResponse.json({ error: 'URL du serveur MCP manquante' }, { status: 400 })
      }
      testResult = await testMcpConnection(mcpConfig.server_url)
    } else {
      // API REST: test call to base_url
      if (!connector.base_url) {
        return NextResponse.json({ error: 'URL de base manquante' }, { status: 400 })
      }
      const credentials = safeDecryptCredentials(connector.credentials_encrypted)
      try {
        const result = await executeApiRestCall(
          connector.base_url,
          connector.http_method || 'GET',
          connector.auth_method,
          credentials,
          (connector.custom_headers as Record<string, string>) || {}
        )
        testResult = {
          ok: result.ok,
          message: result.ok
            ? `Connexion reussie (HTTP ${result.status})`
            : `Erreur HTTP ${result.status}`,
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur inconnue'
        testResult = { ok: false, message: `Echec de connexion: ${msg}` }
      }
    }

    // Update connector status
    await adminClient
      .from('custom_connectors')
      .update({
        status: testResult.ok ? 'active' : 'error',
        last_error: testResult.ok ? null : testResult.message,
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', connector.id)

    return NextResponse.json({
      ok: testResult.ok,
      message: testResult.message,
      ...(testResult.tools ? { tools: testResult.tools } : {}),
    })
  } catch (err) {
    console.error('Error testing custom connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
