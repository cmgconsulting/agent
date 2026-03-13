import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// PATCH /api/admin/agents/[agentId] - Update agent config
export async function PATCH(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.active === 'boolean') updates.active = body.active
    if (typeof body.system_prompt === 'string') updates.system_prompt = body.system_prompt
    if (body.config) updates.config = body.config

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', params.agentId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Audit log
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'update_agent',
      target_type: 'agent',
      target_id: params.agentId,
      details: { updates },
    })

    return NextResponse.json({ agent })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET /api/admin/agents/[agentId]/logs
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

    const { data: logs } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_id', params.agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ logs: logs || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
