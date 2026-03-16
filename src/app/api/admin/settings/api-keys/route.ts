import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/vault'

export const dynamic = 'force-dynamic'

function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 7) + '...' + key.slice(-4)
}

// GET all API keys (masked)
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, provider, is_active, last_used_at, usage_count, key_encrypted, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mask the keys — never return full encrypted value
  const masked = (data || []).map(row => ({
    ...row,
    key_preview: maskKey(row.key_encrypted || ''),
    key_encrypted: undefined,
  }))

  return NextResponse.json({ keys: masked })
}

// POST create a new API key
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { name, provider, key } = await request.json()

  if (!name || !provider || !key) {
    return NextResponse.json({ error: 'name, provider et key sont requis' }, { status: 400 })
  }

  // Encrypt the API key before storing
  let keyEncrypted: string
  try {
    keyEncrypted = encrypt(key)
  } catch {
    // If ENCRYPTION_KEY not set, store with basic obfuscation
    keyEncrypted = Buffer.from(key).toString('base64')
  }

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name,
      provider,
      key_encrypted: keyEncrypted,
      is_active: true,
      usage_count: 0,
      created_by: user.id,
    })
    .select('id, name, provider, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit
  await supabase.from('admin_sessions_log').insert({
    user_id: user.id,
    action: 'api_key.create',
    details: { name, provider },
  })

  return NextResponse.json({ key: data })
}
