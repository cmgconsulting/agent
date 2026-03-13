import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/vault'

export async function PATCH(
  request: Request,
  { params }: { params: { connectorId: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })

  const body = await request.json()
  const { label, credentials, config, status } = body

  const adminClient = createServiceRoleClient()

  const updateData: Record<string, unknown> = {}
  if (label !== undefined) updateData.label = label
  if (config !== undefined) updateData.config = config
  if (status !== undefined) updateData.status = status
  if (credentials) {
    updateData.credentials_encrypted = encryptCredentials(credentials)
    updateData.status = 'inactive' // Reset status when credentials change
  }

  const { data: connector, error } = await adminClient
    .from('connectors')
    .update(updateData)
    .eq('id', params.connectorId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, connector })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { connectorId: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })

  const adminClient = createServiceRoleClient()

  // Get connector info for audit log
  const { data: connector } = await adminClient
    .from('connectors')
    .select('client_id, type')
    .eq('id', params.connectorId)
    .single()

  const { error } = await adminClient
    .from('connectors')
    .delete()
    .eq('id', params.connectorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Audit log
  if (connector) {
    await adminClient.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'delete_connector',
      target_type: 'connector',
      target_id: params.connectorId,
      details: { client_id: connector.client_id, type: connector.type },
    })
  }

  return NextResponse.json({ success: true })
}
