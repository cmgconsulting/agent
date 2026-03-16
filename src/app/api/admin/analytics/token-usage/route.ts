import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  // Parse params
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30', 10)
  const clientId = searchParams.get('client_id')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  // Fetch daily usage
  let query = supabase
    .from('token_usage_daily')
    .select('*')
    .gte('date', startDateStr)
    .order('date', { ascending: true })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data: dailyUsage, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate by day
  const dailyMap = new Map<string, { date: string; total_tokens: number; total_cost: number; request_count: number }>()
  for (const row of dailyUsage || []) {
    const existing = dailyMap.get(row.date) || { date: row.date, total_tokens: 0, total_cost: 0, request_count: 0 }
    existing.total_tokens += row.total_tokens || 0
    existing.total_cost += parseFloat(row.total_cost) || 0
    existing.request_count += row.request_count || 0
    dailyMap.set(row.date, existing)
  }
  const daily_usage = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Aggregate by agent type
  const agentMap = new Map<string, { agent_type: string; total_tokens: number; total_cost: number; request_count: number }>()
  for (const row of dailyUsage || []) {
    const existing = agentMap.get(row.agent_type) || { agent_type: row.agent_type, total_tokens: 0, total_cost: 0, request_count: 0 }
    existing.total_tokens += row.total_tokens || 0
    existing.total_cost += parseFloat(row.total_cost) || 0
    existing.request_count += row.request_count || 0
    agentMap.set(row.agent_type, existing)
  }
  const agent_breakdown = Array.from(agentMap.values()).sort((a, b) => b.total_tokens - a.total_tokens)

  // Totals
  const total_tokens = daily_usage.reduce((s, d) => s + d.total_tokens, 0)
  const total_cost = daily_usage.reduce((s, d) => s + d.total_cost, 0)
  const request_count = daily_usage.reduce((s, d) => s + d.request_count, 0)

  return NextResponse.json({
    daily_usage,
    agent_breakdown,
    total_tokens,
    total_cost: Math.round(total_cost * 100) / 100,
    request_count,
    period_days: days,
  })
}
