import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const supabase = createServerSupabaseClient()
  const clientId = params.clientId

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  // Get client name
  const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single()
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  // Fetch logs
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5000)

  const { data: agents } = await supabase.from('agents').select('id, type, name').eq('client_id', clientId)

  const agentMap = new Map<string, { type: string; name: string }>()
  agents?.forEach(a => agentMap.set(a.id, { type: a.type, name: a.name }))

  // Generate CSV
  const headers = ['date', 'statut', 'agent_type', 'agent_name', 'action', 'tokens', 'duree_ms', 'resume']
  const rows = (logs || []).map(log => {
    const agentInfo = agentMap.get(log.agent_id)
    return [
      log.created_at,
      log.status,
      agentInfo?.type || '',
      agentInfo?.name || '',
      `"${(log.action || '').replace(/"/g, '""')}"`,
      log.tokens_used || 0,
      log.duration_ms || 0,
      `"${(log.payload_summary || '').replace(/"/g, '""')}"`,
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().split('T')[0]
  const safeName = client.company_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="logs-${safeName}-${date}.csv"`,
    },
  })
}
