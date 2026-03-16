import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Get client_id
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).single()

    if (!client && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })
    }

    const clientId = client?.id

    // Get subscription
    const { data: subscription } = await supabase
      .from('client_subscriptions')
      .select('*, billing_plans:plan_id(*)')
      .eq('client_id', clientId)
      .in('status', ['active', 'trial'])
      .single()

    // Get daily usage for the period
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: dailyUsage } = await supabase
      .from('token_usage_daily')
      .select('*')
      .eq('client_id', clientId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Aggregate by agent
    const agentBreakdown: Record<string, { input: number; output: number; total: number; cost: number; requests: number }> = {}
    for (const row of dailyUsage || []) {
      if (!agentBreakdown[row.agent_type]) {
        agentBreakdown[row.agent_type] = { input: 0, output: 0, total: 0, cost: 0, requests: 0 }
      }
      agentBreakdown[row.agent_type].input += Number(row.total_input_tokens)
      agentBreakdown[row.agent_type].output += Number(row.total_output_tokens)
      agentBreakdown[row.agent_type].total += Number(row.total_tokens)
      agentBreakdown[row.agent_type].cost += Number(row.total_cost)
      agentBreakdown[row.agent_type].requests += Number(row.request_count)
    }

    const tokensUsed = subscription?.tokens_used ?? 0
    const tokensQuota = subscription?.tokens_quota ?? 0
    const percentUsed = tokensQuota > 0 ? Math.round((tokensUsed / tokensQuota) * 100 * 100) / 100 : 0

    return NextResponse.json({
      tokens_used: tokensUsed,
      tokens_quota: tokensQuota,
      percent_used: percentUsed,
      plan: subscription?.billing_plans ?? null,
      billing_cycle: subscription?.billing_cycle ?? 'monthly',
      current_period_start: subscription?.current_period_start,
      current_period_end: subscription?.current_period_end,
      daily_usage: dailyUsage || [],
      agent_breakdown: Object.entries(agentBreakdown).map(([agent, data]) => ({
        agent_type: agent,
        ...data,
      })),
      estimated_cost: Object.values(agentBreakdown).reduce((sum, a) => sum + a.cost, 0),
    })
  } catch (error) {
    console.error('Billing usage error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
