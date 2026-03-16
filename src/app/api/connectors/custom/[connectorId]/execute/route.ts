import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'
import { safeDecryptCredentials, executeApiRestCall, refreshOAuth2Token } from '@/lib/connectors/custom-connector-utils'
import { callMcpTool } from '@/lib/connectors/mcp-client'
import { encryptCredentials } from '@/lib/vault'

export const dynamic = 'force-dynamic'
export async function POST(
  request: Request,
  { params }: { params: { connectorId: string } }
) {
  try {
    // Rate limiting
    const rateLimitResult = checkRateLimit(`custom-execute:${params.connectorId}`, RATE_LIMITS.api)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes, reessayez plus tard' },
        { status: 429 }
      )
    }

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

    if (connector.status !== 'active') {
      return NextResponse.json(
        { error: 'Connecteur inactif. Testez-le d\'abord.' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // ============================================
    // MCP execution
    // ============================================
    if (connector.connector_type === 'mcp') {
      const mcpConfig = connector.mcp_config as { server_url?: string } | null
      if (!mcpConfig?.server_url) {
        return NextResponse.json({ error: 'URL du serveur MCP manquante' }, { status: 400 })
      }

      const { tool_name, arguments: toolArgs } = body
      if (!tool_name) {
        return NextResponse.json({ error: 'tool_name requis pour MCP' }, { status: 400 })
      }

      try {
        const result = await callMcpTool(mcpConfig.server_url, tool_name, toolArgs || {})
        return NextResponse.json({ success: true, result })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur MCP'
        return NextResponse.json({ error: msg }, { status: 502 })
      }
    }

    // ============================================
    // API REST execution
    // ============================================
    if (!connector.base_url) {
      return NextResponse.json({ error: 'URL de base manquante' }, { status: 400 })
    }

    let credentials = safeDecryptCredentials(connector.credentials_encrypted)

    // OAuth2: check if token needs refresh
    if (connector.auth_method === 'oauth2' && credentials.token_expires_at) {
      const expiresAt = parseInt(credentials.token_expires_at, 10)
      if (Date.now() > expiresAt - 60_000) {
        const refreshed = await refreshOAuth2Token(credentials)
        if (refreshed) {
          credentials = refreshed
          // Save refreshed token
          await adminClient
            .from('custom_connectors')
            .update({ credentials_encrypted: encryptCredentials(refreshed) })
            .eq('id', connector.id)
        }
      }
    }

    const { url, method, payload } = body
    const targetUrl = url || connector.base_url
    const httpMethod = method || connector.http_method || 'GET'

    try {
      const result = await executeApiRestCall(
        targetUrl,
        httpMethod,
        connector.auth_method,
        credentials,
        (connector.custom_headers as Record<string, string>) || {},
        payload
      )

      return NextResponse.json({
        success: result.ok,
        status: result.status,
        data: result.data,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      return NextResponse.json({ error: `Echec de l'appel: ${msg}` }, { status: 502 })
    }
  } catch (err) {
    console.error('Error executing custom connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
