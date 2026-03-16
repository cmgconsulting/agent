import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredentials } from '@/lib/vault'
import type { ConnectorType } from '@/types/database'

export const dynamic = 'force-dynamic'
export async function GET(
  _request: Request,
  { params }: { params: { clientId: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })

  const { data: connectors, error } = await supabase
    .from('connectors')
    .select('id, client_id, type, label, status, last_tested_at, config, created_at, updated_at')
    .eq('client_id', params.clientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ connectors })
}

export async function POST(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })

    const body = await request.json()
    const { type, label, credentials, config } = body as {
      type: ConnectorType
      label?: string
      credentials: Record<string, string>
      config?: Record<string, unknown>
    }

    if (!type) return NextResponse.json({ error: 'Type de connecteur requis' }, { status: 400 })

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials)

    const adminClient = createServiceRoleClient()

    const { data: connector, error } = await adminClient
      .from('connectors')
      .insert({
        client_id: params.clientId,
        type,
        label: label || null,
        credentials_encrypted: encryptedCredentials,
        status: 'inactive',
        config: config || {},
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Log admin action
    await adminClient.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'add_connector',
      target_type: 'connector',
      target_id: connector.id,
      details: { client_id: params.clientId, type },
    })

    return NextResponse.json({ success: true, connector })
  } catch (err) {
    console.error('Error creating connector:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
