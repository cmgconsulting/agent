import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AGENTS, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType, AgentType } from '@/types/database'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import { DollarSign, Users, Zap, Activity, ArrowUp, ArrowDown, Cpu, Download, FileText, BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const supabase = createServerSupabaseClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().split('T')[0]

  const [
    { data: clients },
    { data: allAgents },
    { data: allConnectors },
    { data: allLogs },
    { data: subscriptions },
    { data: billingPlans },
    { data: tokenThisMonth },
    { data: tokenLastMonth },
    { data: tokenDaily30 },
    { data: billingAlerts },
  ] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('agents').select('*'),
    supabase.from('connectors').select('*'),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('client_subscriptions').select('*, billing_plans:plan_id(price_monthly, display_name, slug)').in('status', ['active', 'trial']),
    supabase.from('billing_plans').select('*').eq('is_active', true).order('price_monthly'),
    supabase.from('token_usage_daily').select('*').gte('date', monthStart),
    supabase.from('token_usage_daily').select('total_tokens, total_cost').gte('date', lastMonthStart).lt('date', monthStart),
    supabase.from('token_usage_daily').select('*').gte('date', thirtyDaysAgo).order('date', { ascending: true }),
    supabase.from('billing_alerts').select('*').eq('dismissed', false),
  ])

  // Real MRR from subscriptions + billing_plans
  const mrr = subscriptions?.reduce((sum, sub) => {
    const plan = sub.billing_plans as Record<string, unknown> | null
    return sum + (Number(plan?.price_monthly) || 0)
  }, 0) || 0
  const arr = mrr * 12

  // MRR breakdown by plan
  const planBreakdown = (billingPlans || []).map(bp => {
    const subCount = subscriptions?.filter(s => {
      const plan = s.billing_plans as Record<string, unknown> | null
      return plan?.slug === bp.slug
    }).length || 0
    return {
      name: bp.display_name as string,
      slug: bp.slug as string,
      price: Number(bp.price_monthly) || 0,
      count: subCount,
      subtotal: subCount * (Number(bp.price_monthly) || 0),
    }
  })

  // Plan distribution for badges
  const planCounts: Record<PlanType, number> = { starter: 0, pro: 0, enterprise: 0 }
  const activeClients = clients?.filter(c => c.is_active) || []
  activeClients.forEach(c => { if (c.plan in planCounts) planCounts[c.plan as PlanType]++ })

  // Agent usage stats
  const agentStats = AGENTS.map(agent => {
    const total = allAgents?.filter(a => a.type === agent.type).length || 0
    const active = allAgents?.filter(a => a.type === agent.type && a.active).length || 0
    const logs = allLogs?.filter(l => {
      const agentRecord = allAgents?.find(a => a.id === l.agent_id)
      return agentRecord?.type === agent.type
    }).length || 0
    return { ...agent, total, active, logs }
  }).sort((a, b) => b.logs - a.logs)

  // Token usage from token_usage_daily
  const tokensThisMonth = tokenThisMonth?.reduce((s, d) => s + (d.total_tokens || 0), 0) || 0
  const costThisMonth = tokenThisMonth?.reduce((s, d) => s + (parseFloat(d.total_cost) || 0), 0) || 0
  const tokensLastMonth = tokenLastMonth?.reduce((s, d) => s + (d.total_tokens || 0), 0) || 0
  const tokenDelta = tokensLastMonth > 0 ? ((tokensThisMonth - tokensLastMonth) / tokensLastMonth) * 100 : 0
  const requestsThisMonth = tokenThisMonth?.reduce((s, d) => s + (d.request_count || 0), 0) || 0

  // Token breakdown by agent type
  const agentTokenMap = new Map<string, { agent_type: string; tokens: number; cost: number; requests: number }>()
  for (const row of tokenThisMonth || []) {
    const key = row.agent_type || 'unknown'
    const existing = agentTokenMap.get(key) || { agent_type: key, tokens: 0, cost: 0, requests: 0 }
    existing.tokens += row.total_tokens || 0
    existing.cost += parseFloat(row.total_cost) || 0
    existing.requests += row.request_count || 0
    agentTokenMap.set(key, existing)
  }
  const agentTokenBreakdown = Array.from(agentTokenMap.values()).sort((a, b) => b.tokens - a.tokens)

  // Daily token usage (30 days) for chart
  const dailyTokens = new Map<string, { date: string; tokens: number; cost: number }>()
  for (const row of tokenDaily30 || []) {
    const existing = dailyTokens.get(row.date) || { date: row.date, tokens: 0, cost: 0 }
    existing.tokens += row.total_tokens || 0
    existing.cost += parseFloat(row.total_cost) || 0
    dailyTokens.set(row.date, existing)
  }
  const dailyTokenData = Array.from(dailyTokens.values()).sort((a, b) => a.date.localeCompare(b.date))
  const maxDailyTokens = Math.max(...dailyTokenData.map(d => d.tokens), 1)

  // Top 5 clients by token consumption
  const clientTokenMap = new Map<string, { client_id: string; tokens: number; cost: number }>()
  for (const row of tokenThisMonth || []) {
    const key = row.client_id
    const existing = clientTokenMap.get(key) || { client_id: key, tokens: 0, cost: 0 }
    existing.tokens += row.total_tokens || 0
    existing.cost += parseFloat(row.total_cost) || 0
    clientTokenMap.set(key, existing)
  }
  const topConsumers = Array.from(clientTokenMap.values())
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5)
    .map(tc => {
      const client = clients?.find(c => c.id === tc.client_id)
      return { ...tc, company_name: client?.company_name || 'Inconnu', plan: client?.plan || 'starter' }
    })

  // Success rates
  const thisMonthLogs = allLogs?.filter(l => l.created_at >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString()) || []
  const successLogs = thisMonthLogs.filter(l => l.status === 'success').length
  const errorLogs = thisMonthLogs.filter(l => l.status === 'error').length
  const totalLogs = thisMonthLogs.length
  const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100

  // Client acquisition by month (last 6 months)
  const months: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const count = clients?.filter(c => {
      const created = new Date(c.created_at)
      return created >= d && created < monthEnd
    }).length || 0
    months.push({ label, count })
  }

  // Top clients by activity
  const topClients = (clients || [])
    .map(c => ({
      ...c,
      agentCount: allAgents?.filter(a => a.client_id === c.id && a.active).length || 0,
      connectorCount: allConnectors?.filter(cn => cn.client_id === c.id && cn.status === 'active').length || 0,
      logCount: allLogs?.filter(l => l.client_id === c.id).length || 0,
    }))
    .sort((a, b) => b.logCount - a.logCount)
    .slice(0, 5)

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-brand-500" />}
        title="Analytics"
        subtitle="Métriques clés de la plateforme CMG Agents"
      />
      <div className="flex items-center justify-end gap-2 mb-6">
        <a
          href="/api/admin/logs/export?format=pdf"
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <FileText className="w-4 h-4" /> Export PDF
        </a>
        <a
          href="/api/admin/logs/export"
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-50 p-2 rounded-xl"><DollarSign className="w-4 h-4 text-emerald-500" /></div>
            <span className="text-xs font-medium text-ink-400 uppercase">MRR</span>
          </div>
          <p className="text-2xl font-bold text-ink-700">{mrr.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-ink-300 mt-1">ARR: {arr.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-50 p-2 rounded-xl"><Users className="w-4 h-4 text-blue-500" /></div>
            <span className="text-xs font-medium text-ink-400 uppercase">Clients actifs</span>
          </div>
          <p className="text-2xl font-bold text-ink-700">{activeClients.length}</p>
          <p className="text-xs text-ink-300 mt-1">sur {clients?.length || 0} total</p>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-brand-50 p-2 rounded-xl"><Zap className="w-4 h-4 text-brand-500" /></div>
            <span className="text-xs font-medium text-ink-400 uppercase">Tokens (mois)</span>
          </div>
          <p className="text-2xl font-bold text-ink-700">
            {tokensThisMonth > 1000000 ? `${(tokensThisMonth / 1000000).toFixed(1)}M` :
             tokensThisMonth > 1000 ? `${Math.round(tokensThisMonth / 1000)}k` : tokensThisMonth}
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${tokenDelta >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {tokenDelta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(Math.round(tokenDelta))}% vs mois précédent
          </p>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className={`${successRate >= 90 ? 'bg-emerald-50' : successRate >= 70 ? 'bg-amber-50' : 'bg-red-50'} p-2 rounded-xl`}>
              <Activity className={`w-4 h-4 ${successRate >= 90 ? 'text-emerald-500' : successRate >= 70 ? 'text-amber-500' : 'text-red-500'}`} />
            </div>
            <span className="text-xs font-medium text-ink-400 uppercase">Taux de succès</span>
          </div>
          <p className="text-2xl font-bold text-ink-700">{successRate}%</p>
          <p className="text-xs text-ink-300 mt-1">{errorLogs} erreurs / {totalLogs} ops ce mois</p>
        </div>
      </div>

      {/* Billing alerts */}
      {billingAlerts && billingAlerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {billingAlerts.map((alert) => (
            <div key={alert.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              alert.alert_type === 'quota_exceeded' ? 'bg-red-50 text-red-700 border border-red-200' :
              alert.alert_type === 'quota_warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-brand-50 text-brand-700 border border-brand-200'
            }`}>
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MRR by plan — real billing data */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Revenus par plan (MRR réel)</h3>
          <div className="space-y-4">
            {planBreakdown.map(bp => {
              const pct = mrr > 0 ? (bp.subtotal / mrr) * 100 : 0
              const colorMap: Record<string, string> = { starter: 'bg-emerald-400', pro: 'bg-blue-500', enterprise: 'bg-purple-500' }
              const color = colorMap[bp.slug] || 'bg-surface-200'
              return (
                <div key={bp.slug}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-ink-600">{bp.name} ({bp.count} clients x {bp.price}€)</span>
                    <span className="font-semibold text-ink-700">{bp.subtotal.toLocaleString('fr-FR')} €/mois</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-3">
                    <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t border-surface-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-600">Total MRR</span>
              <span className="text-lg font-bold text-ink-700">{mrr.toLocaleString('fr-FR')} €</span>
            </div>
          </div>
        </div>

        {/* Client acquisition */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Acquisition clients (6 mois)</h3>
          <div className="flex items-end gap-3 h-40">
            {months.map((m, i) => {
              const maxCount = Math.max(...months.map(mm => mm.count), 1)
              const heightPct = (m.count / maxCount) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-ink-600">{m.count}</span>
                  <div className="w-full bg-surface-100 rounded-t-lg relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-brand-400 rounded-t-lg transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-300">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Claude API Consumption Section */}
      <div className="card mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Cpu className="w-5 h-5 text-purple-500" />
          <h2 className="section-title mb-0">Consommation Claude API</h2>
        </div>

        {/* API consumption KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 uppercase">Tokens ce mois</p>
            <p className="text-xl font-bold text-ink-700 mt-1">
              {tokensThisMonth > 1000000 ? `${(tokensThisMonth / 1000000).toFixed(1)}M` :
               tokensThisMonth > 1000 ? `${Math.round(tokensThisMonth / 1000)}k` : tokensThisMonth}
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 uppercase">Coût estimé</p>
            <p className="text-xl font-bold text-ink-700 mt-1">{(Math.round(costThisMonth * 100) / 100).toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 uppercase">Requêtes</p>
            <p className="text-xl font-bold text-ink-700 mt-1">{requestsThisMonth.toLocaleString('fr-FR')}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 uppercase">Delta vs mois préc.</p>
            <p className={`text-xl font-bold mt-1 flex items-center gap-1 ${tokenDelta >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {tokenDelta >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {Math.abs(Math.round(tokenDelta))}%
            </p>
          </div>
        </div>

        {/* Daily token usage chart (30 days) */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-ink-400 mb-3">Tokens par jour (30 derniers jours)</h4>
          <div className="flex items-end gap-px h-32">
            {dailyTokenData.map((d, i) => {
              const heightPct = (d.tokens / maxDailyTokens) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center" title={`${d.date}: ${d.tokens.toLocaleString('fr-FR')} tokens`}>
                  <div className="w-full bg-surface-50 rounded-t relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-purple-400 hover:bg-purple-500 rounded-t transition-all"
                      style={{ height: `${heightPct}%`, minHeight: d.tokens > 0 ? '2px' : '0' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {dailyTokenData.length > 0 && (
            <div className="flex justify-between mt-1">
              <span className="text-xs text-ink-300">{dailyTokenData[0]?.date}</span>
              <span className="text-xs text-ink-300">{dailyTokenData[dailyTokenData.length - 1]?.date}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent token breakdown */}
          <div>
            <h4 className="text-sm font-medium text-ink-400 mb-3">Répartition par agent</h4>
            <div className="space-y-2">
              {agentTokenBreakdown.length > 0 ? agentTokenBreakdown.map(at => {
                const agentConfig = AGENTS.find(a => a.type === at.agent_type)
                const pct = tokensThisMonth > 0 ? (at.tokens / tokensThisMonth) * 100 : 0
                return (
                  <div key={at.agent_type} className="flex items-center gap-3">
                    <AgentAvatar type={at.agent_type as AgentType} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="font-medium text-ink-600">{agentConfig?.name || at.agent_type}</span>
                        <span className="text-ink-400">
                          {at.tokens > 1000 ? `${Math.round(at.tokens / 1000)}k` : at.tokens} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-100 rounded-full h-1.5">
                        <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <p className="text-sm text-ink-300 text-center py-4">Aucune donnée de consommation</p>
              )}
            </div>
          </div>

          {/* Top 5 consumers */}
          <div>
            <h4 className="text-sm font-medium text-ink-400 mb-3">Top 5 clients consommateurs</h4>
            <div className="space-y-2">
              {topConsumers.length > 0 ? topConsumers.map((tc, i) => (
                <div key={tc.client_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50 transition-colors">
                  <span className="text-sm font-bold text-ink-200 w-5">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-600">{tc.company_name}</p>
                    <p className="text-xs text-ink-300">
                      {tc.tokens > 1000 ? `${Math.round(tc.tokens / 1000)}k` : tc.tokens} tokens · {(Math.round(tc.cost * 100) / 100).toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    tc.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                    tc.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {PLAN_LABELS[tc.plan as PlanType]}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-ink-300 text-center py-4">Aucune donnée</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent usage ranking */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Utilisation par agent</h3>
          <div className="space-y-3">
            {agentStats.map((agent, i) => (
              <div key={agent.type} className="flex items-center gap-3">
                <span className="text-sm font-bold text-ink-200 w-5">#{i + 1}</span>
                <AgentAvatar type={agent.type as AgentType} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-600">{agent.name}</span>
                    <span className="text-sm text-ink-400">{agent.active} actifs / {agent.total}</span>
                  </div>
                  <p className="text-xs text-ink-300">{agent.logs} opérations ce mois</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top clients */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Clients les plus actifs</h3>
          <div className="space-y-3">
            {topClients.length > 0 ? topClients.map((client, i) => (
              <Link key={client.id} href={`/admin/clients/${client.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
                <span className="text-sm font-bold text-ink-200 w-5">#{i + 1}</span>
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                  <span className="text-brand-600 font-bold text-xs">{client.company_name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-600">{client.company_name}</p>
                  <p className="text-xs text-ink-300">
                    {client.agentCount} agents · {client.connectorCount} connecteurs · {client.logCount} ops
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  client.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                  client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {PLAN_LABELS[client.plan as PlanType]}
                </span>
              </Link>
            )) : (
              <p className="text-ink-300 text-sm text-center py-4">Aucun client</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
