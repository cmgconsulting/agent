import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// PUT toggle is_active
export async function PUT(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { is_active } = await request.json()

  const { data, error } = await supabase
    .from('api_keys')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', params.keyId)
    .select('id, name, provider, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_sessions_log').insert({
    user_id: user.id,
    action: is_active ? 'api_key.enable' : 'api_key.disable',
    details: { key_id: params.keyId, name: data?.name },
  })

  return NextResponse.json({ key: data })
}

// DELETE remove API key
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Get name before delete for audit
  const { data: existing } = await supabase
    .from('api_keys')
    .select('name, provider')
    .eq('id', params.keyId)
    .single()

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', params.keyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_sessions_log').insert({
    user_id: user.id,
    action: 'api_key.delete',
    details: { key_id: params.keyId, name: existing?.name, provider: existing?.provider },
  })

  return NextResponse.json({ success: true })
}
