import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET all platform_settings
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const category = request.nextUrl.searchParams.get('category')

  let query = supabase.from('platform_settings').select('*')
  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('category').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Transform to key-value map
  const settings: Record<string, unknown> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }

  return NextResponse.json({ settings, rows: data })
}

// PUT update platform_settings
export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { settings } = await request.json() as { settings: Record<string, unknown> }
  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Body invalide' }, { status: 400 })
  }

  const keysUpdated: string[] = []
  const errors: string[] = []

  for (const [key, value] of Object.entries(settings)) {
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: JSON.stringify(value), updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (error) {
      // Try upsert if row doesn't exist
      const { error: upsertError } = await supabase
        .from('platform_settings')
        .upsert({
          key,
          value: JSON.stringify(value),
          category: 'general',
          updated_by: user.id,
        }, { onConflict: 'key' })

      if (upsertError) errors.push(`${key}: ${upsertError.message}`)
      else keysUpdated.push(key)
    } else {
      keysUpdated.push(key)
    }
  }

  // Log audit
  await supabase.from('admin_sessions_log').insert({
    user_id: user.id,
    action: 'settings.update',
    details: { keys_updated: keysUpdated },
  })

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors, keysUpdated }, { status: 207 })
  }

  return NextResponse.json({ success: true, keysUpdated })
}
