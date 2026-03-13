import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AGENTS, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType } from '@/types/database'
import { DollarSign, Users, Zap, Activity, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const supabase = createServerSupabaseClient()

  const [
    { data: clients },
    { data: allAgents },
    { data: allConnectors },
    { data: allLogs },
  ] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('agents').select('*'),
    supabase.from('connectors').select('*'),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('kpis').select('*').order('created_at', { ascending: false }).limit(500),
  ])

  // MRR calculation
  const planPrices = { basic: 99, pro: 249, full: 499 }
  const planCounts: Record<PlanType, number> = { basic: 0, pro: 0, full: 0 }
  const activeClients = clients?.filter(c => c.is_active) || []
  activeClients.forEach(c => { if (c.plan in planCounts) planCounts[c.plan as PlanType]++ })
  const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => sum + (planPrices[plan as PlanType] || 0) * count, 0)
  const arr = mrr * 12

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

  // Token usage
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const thisMonthLogs = allLogs?.filter(l => l.created_at >= monthStart) || []
  const lastMonthLogs = allLogs?.filter(l => l.created_at >= lastMonthStart && l.created_at < monthStart) || []
  const tokensThisMonth = thisMonthLogs.reduce((s, l) => s + (l.tokens_used || 0), 0)
  const tokensLastMonth = lastMonthLogs.reduce((s, l) => s + (l.tokens_used || 0), 0)
  const tokenDelta = tokensLastMonth > 0 ? ((tokensThisMonth - tokensLastMonth) / tokensLastMonth) * 100 : 0

  // Success rates
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

  // Top clients by agent count
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Metriques cles de la plateforme CMG Agents</p>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-500 p-2 rounded-lg"><DollarSign className="w-4 h-4 text-white" /></div>
            <span className="text-xs font-medium text-gray-500 uppercase">MRR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{mrr.toLocaleString('fr-FR')} €</p>
          <p className="text-xs text-gray-400 mt-1">ARR: {arr.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-500 p-2 rounded-lg"><Users className="w-4 h-4 text-white" /></div>
            <span className="text-xs font-medium text-gray-500 uppercase">Clients actifs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeClients.length}</p>
          <p className="text-xs text-gray-400 mt-1">sur {clients?.length || 0} total</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-cyan-500 p-2 rounded-lg"><Zap className="w-4 h-4 text-white" /></div>
            <span className="text-xs font-medium text-gray-500 uppercase">Tokens (mois)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {tokensThisMonth > 1000000 ? `${(tokensThisMonth / 1000000).toFixed(1)}M` :
             tokensThisMonth > 1000 ? `${Math.round(tokensThisMonth / 1000)}k` : tokensThisMonth}
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${tokenDelta >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {tokenDelta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(Math.round(tokenDelta))}% vs mois precedent
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`${successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'} p-2 rounded-lg`}>
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Taux de succes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{errorLogs} erreurs / {totalLogs} ops ce mois</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Plan distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenus par plan</h3>
          <div className="space-y-4">
            {(['basic', 'pro', 'full'] as PlanType[]).map(plan => {
              const count = planCounts[plan]
              const revenue = count * planPrices[plan]
              const pct = mrr > 0 ? (revenue / mrr) * 100 : 0
              const colors = { basic: 'bg-gray-400', pro: 'bg-blue-500', full: 'bg-purple-500' }
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{PLAN_LABELS[plan]} ({count} clients)</span>
                    <span className="font-semibold text-gray-900">{revenue.toLocaleString('fr-FR')} €/mois</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`${colors[plan]} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Client acquisition */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Acquisition clients (6 mois)</h3>
          <div className="flex items-end gap-3 h-40">
            {months.map((m, i) => {
              const maxCount = Math.max(...months.map(mm => mm.count), 1)
              const heightPct = (m.count / maxCount) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{m.count}</span>
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent usage ranking */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Utilisation par agent</h3>
          <div className="space-y-3">
            {agentStats.map((agent, i) => (
              <div key={agent.type} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300 w-5">#{i + 1}</span>
                <span className="text-lg">{agent.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{agent.name}</span>
                    <span className="text-sm text-gray-500">{agent.active} actifs / {agent.total}</span>
                  </div>
                  <p className="text-xs text-gray-400">{agent.logs} operations ce mois</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Clients les plus actifs</h3>
          <div className="space-y-3">
            {topClients.length > 0 ? topClients.map((client, i) => (
              <Link key={client.id} href={`/admin/clients/${client.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <span className="text-sm font-bold text-gray-300 w-5">#{i + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">{client.company_name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{client.company_name}</p>
                  <p className="text-xs text-gray-400">
                    {client.agentCount} agents · {client.connectorCount} connecteurs · {client.logCount} ops
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  client.plan === 'full' ? 'bg-purple-100 text-purple-700' :
                  client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {PLAN_LABELS[client.plan as PlanType]}
                </span>
              </Link>
            )) : (
              <p className="text-gray-400 text-sm text-center py-4">Aucun client</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
