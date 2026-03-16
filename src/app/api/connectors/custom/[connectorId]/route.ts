import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/vault'
import { sanitizeString } from '@/lib/security'
import { safeDecryptCredentials, maskCredentials } from '@/lib/connectors/custom-connector-utils'

async function getClientAndConnector(connectorId: string) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifie', status: 401 }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!client) return { error: 'Client introuvable', status: 404 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const adminClient = createServiceRoleClient()
  const { data: connector } = await adminClient
    .from('custom_connectors')
    .select('*')
    .eq('id', connectorId)
    .single()

  if (!connector) return { error: 'Connecteur introuvable', status: 404 }

  // Check ownership (client owns it or user is admin)
  if (connector.client_id !== client.id && profile?.role !== 'admin') {
    return { error: 'Acces refuse', status: 403 }
  }

  return { client, connector, adminClient }
}

// ============================================
// GET — Get single custom connector
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { connectorId: string } }
) {
  try {
    const result = await getClientAndConnector(params.connectorId)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

    const { connector } = result

    return NextResponse.json({
      connector: {
        ...connector,
        credentials_encrypted: undefined,
        credentials_masked: maskCredentials(safeDecryptCredentials(connector.credentials_encrypted)),
      },
    })
  } catch (err) {
    console.error('Error getting custom connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// PUT — Update custom connector
// ============================================

export async function PUT(
  request: Request,
  { params }: { params: { connectorId: string } }
) {
  try {
    const result = await getClientAndConnector(params.connectorId)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

    const { connector, adminClient } = result
    const body = await request.json()

    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = sanitizeString(body.name, 100)
    if (body.description !== undefined) updates.description = body.description ? sanitizeString(body.description, 500) : null
    if (body.base_url !== undefined) updates.base_url = body.base_url ? sanitizeString(body.base_url, 2000) : null
    if (body.http_method !== undefined) updates.http_method = body.http_method
    if (body.auth_method !== undefined) updates.auth_method = body.auth_method
    if (body.custom_headers !== undefined) updates.custom_headers = body.custom_headers
    if (body.mcp_config !== undefined) updates.mcp_config = body.mcp_config

    // If credentials changed, re-encrypt and reset status
    if (body.credentials !== undefined) {
      if (body.credentials && typeof body.credentials === 'object' && Object.keys(body.credentials).length > 0) {
        updates.credentials_encrypted = encryptCredentials(body.credentials)
      } else {
        updates.credentials_encrypted = null
      }
      updates.status = 'inactive'
    }

    const { data: updated, error } = await adminClient
      .from('custom_connectors')
      .update(updates)
      .eq('id', connector.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating custom connector:', error)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      connector: {
        ...updated,
        credentials_encrypted: undefined,
        credentials_masked: maskCredentials(
          body.credentials || safeDecryptCredentials(updated.credentials_encrypted)
        ),
      },
    })
  } catch (err) {
    console.error('Error updating custom connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// DELETE — Delete custom connector
// ============================================

export async function DELETE(
  _request: Request,
  { params }: { params: { connectorId: string } }
) {
  try {
    const result = await getClientAndConnector(params.connectorId)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })

    const { connector, adminClient } = result

    const { error } = await adminClient
      .from('custom_connectors')
      .delete()
      .eq('id', connector.id)

    if (error) {
      console.error('Error deleting custom connector:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting custom connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
