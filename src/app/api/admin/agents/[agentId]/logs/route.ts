import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const since = url.searchParams.get('since') // ISO timestamp for real-time polling

    let query = supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_id', params.agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gt('created_at', since)
    }

    const { data: logs } = await query

    return NextResponse.json({ logs: logs || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
