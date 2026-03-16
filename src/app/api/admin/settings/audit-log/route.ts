import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const action = request.nextUrl.searchParams.get('action')

  let query = supabase
    .from('admin_sessions_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (action) query = query.eq('action', action)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with profile info
  const userIds = Array.from(new Set((data || []).map(d => d.user_id).filter(Boolean)))
  const profileMap: Record<string, { email: string; full_name: string }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    for (const p of profiles || []) {
      profileMap[p.id] = { email: p.email, full_name: p.full_name }
    }
  }

  const enriched = (data || []).map(row => ({
    ...row,
    user_email: profileMap[row.user_id]?.email || '—',
    user_name: profileMap[row.user_id]?.full_name || '—',
  }))

  return NextResponse.json({ logs: enriched })
}
