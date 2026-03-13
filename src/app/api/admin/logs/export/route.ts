import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'

export async function GET() {
  const supabase = createServerSupabaseClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  // Rate limit exports
  const rl = checkRateLimit(`export:${user.id}`, RATE_LIMITS.export)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop d\'exports. Reessayez plus tard.' }, { status: 429 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  // Fetch logs with related data
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000)

  const { data: agents } = await supabase.from('agents').select('id, type, name, client_id')
  const { data: clients } = await supabase.from('clients').select('id, company_name')

  const agentMap = new Map<string, { type: string; name: string; clientId: string }>()
  agents?.forEach(a => agentMap.set(a.id, { type: a.type, name: a.name, clientId: a.client_id }))

  const clientMap = new Map<string, string>()
  clients?.forEach(c => clientMap.set(c.id, c.company_name))

  // Generate CSV
  const headers = ['date', 'statut', 'agent_type', 'agent_name', 'client', 'action', 'tokens', 'duree_ms', 'resume']
  const rows = (logs || []).map(log => {
    const agentInfo = agentMap.get(log.agent_id)
    return [
      log.created_at,
      log.status,
      agentInfo?.type || '',
      agentInfo?.name || '',
      log.client_id ? (clientMap.get(log.client_id) || '') : '',
      `"${(log.action || '').replace(/"/g, '""')}"`,
      log.tokens_used || 0,
      log.duration_ms || 0,
      `"${(log.payload_summary || '').replace(/"/g, '""')}"`,
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().split('T')[0]

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cmg-agents-logs-${date}.csv"`,
    },
  })
}
