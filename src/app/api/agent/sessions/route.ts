import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/agent/sessions
 * Lists agent sessions for the current client.
 * Query params: ?status=thinking,executing&limit=20&agent_id=xxx
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()
    if (!profile?.client_id) return NextResponse.json({ error: 'Pas de client associe' }, { status: 403 })

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')?.split(',')
    const agentId = url.searchParams.get('agent_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)

    let query = supabase
      .from('agent_sessions')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (statusFilter?.length) {
      query = query.in('status', statusFilter)
    }
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sessions: data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
