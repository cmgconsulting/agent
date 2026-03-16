import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { listMcpTools } from '@/lib/connectors/mcp-client'

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

    if (connector.connector_type !== 'mcp') {
      return NextResponse.json(
        { error: 'La decouverte de tools n\'est disponible que pour les connecteurs MCP' },
        { status: 400 }
      )
    }

    const mcpConfig = connector.mcp_config as { server_url?: string } | null
    if (!mcpConfig?.server_url) {
      return NextResponse.json({ error: 'URL du serveur MCP manquante' }, { status: 400 })
    }

    try {
      const tools = await listMcpTools(mcpConfig.server_url)

      // Save discovered tools in mcp_config
      await adminClient
        .from('custom_connectors')
        .update({
          mcp_config: {
            ...mcpConfig,
            discovered_tools: tools,
          },
        })
        .eq('id', connector.id)

      return NextResponse.json({
        success: true,
        tools,
        message: `${tools.length} tool(s) decouvert(s)`,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      return NextResponse.json(
        { error: `Echec de la decouverte MCP: ${msg}` },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('Error discovering MCP tools:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
