import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Users, Bot, Plug, AlertTriangle, Activity, DollarSign, Zap, Clock } from 'lucide-react'
import Link from 'next/link'
import { AGENTS, PLAN_LABELS, PLAN_AGENTS_LIMIT } from '@/lib/agents-config'
import type { PlanType } from '@/types/database'

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient()

  // Fetch all data in parallel
  const [
    { data: clients },
    { data: allAgents },
    { data: allConnectors },
    { data: recentLogs },
    { data: pendingActions },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('agents').select('*'),
    supabase.from('connectors').select('*'),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('pending_actions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
  ])

  const totalClients = clients?.length || 0
  const activeClients = clients?.filter(c => c.is_active).length || 0
  const totalAgentsActive = allAgents?.filter(a => a.active).length || 0
  const totalConnectors = allConnectors?.filter(c => c.status === 'active').length || 0
  const errorConnectors = allConnectors?.filter(c => c.status === 'error').length || 0
  const pendingCount = pendingActions?.length || 0

  // Calculate tokens used this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthLogs = recentLogs?.filter(l => l.created_at >= monthStart) || []
  const tokensThisMonth = monthLogs.reduce((sum, l) => sum + (l.tokens_used || 0), 0)

  // Plan distribution
  const planCounts = { basic: 0, pro: 0, full: 0 }
  clients?.forEach(c => {
    if (c.plan in planCounts) planCounts[c.plan as PlanType]++
  })

  // Estimate MRR (basic: 99€, pro: 249€, full: 499€)
  const planPrices = { basic: 99, pro: 249, full: 499 }
  const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => sum + (planPrices[plan as PlanType] || 0) * count, 0)

  // Alerts
  const alerts: { type: 'error' | 'warning' | 'info'; message: string; link?: string }[] = []
  if (errorConnectors > 0) {
    alerts.push({ type: 'error', message: `${errorConnectors} connecteur(s) en erreur`, link: '#connectors-section' })
  }
  if (pendingCount > 0) {
    alerts.push({ type: 'warning', message: `${pendingCount} action(s) en attente d'approbation` })
  }
  const inactiveClients = clients?.filter(c => !c.is_active) || []
  if (inactiveClients.length > 0) {
    alerts.push({ type: 'info', message: `${inactiveClients.length} client(s) suspendu(s)` })
  }
  // Clients not fully onboarded
  const notOnboarded = clients?.filter(c => !c.onboarded_at) || []
  if (notOnboarded.length > 0) {
    alerts.push({ type: 'info', message: `${notOnboarded.length} client(s) pas encore onboarde(s)` })
  }

  const stats = [
    { label: 'MRR estime', value: `${mrr.toLocaleString('fr-FR')} €`, icon: DollarSign, color: 'bg-emerald-500', trend: null },
    { label: 'Clients actifs', value: `${activeClients}/${totalClients}`, icon: Users, color: 'bg-blue-500', trend: null },
    { label: 'Agents actifs', value: totalAgentsActive, icon: Bot, color: 'bg-purple-500', trend: null },
    { label: 'Connecteurs OK', value: totalConnectors, icon: Plug, color: 'bg-orange-500', trend: errorConnectors > 0 ? `${errorConnectors} erreur(s)` : null },
    { label: 'Tokens (mois)', value: tokensThisMonth > 1000 ? `${Math.round(tokensThisMonth / 1000)}k` : tokensThisMonth, icon: Zap, color: 'bg-cyan-500', trend: null },
    { label: 'Actions en attente', value: pendingCount, icon: Clock, color: pendingCount > 0 ? 'bg-amber-500' : 'bg-gray-400', trend: null },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-500">Vue d&apos;ensemble de la plateforme CMG Agents</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/onboarding"
            className="bg-white text-gray-700 border border-gray-300 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            🚀 Onboarding
          </Link>
          <Link
            href="/admin/clients/new"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Nouveau client
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              alert.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              alert.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            {stat.trend && <p className="text-xs text-red-500 mt-1">{stat.trend}</p>}
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Repartition par plan</h3>
          <div className="space-y-3">
            {(['basic', 'pro', 'full'] as PlanType[]).map(plan => {
              const count = planCounts[plan]
              const pct = totalClients > 0 ? (count / totalClients) * 100 : 0
              const colors = { basic: 'bg-gray-400', pro: 'bg-blue-500', full: 'bg-purple-500' }
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{PLAN_LABELS[plan]}</span>
                    <span className="text-gray-500">{count} clients ({planPrices[plan]}€/mois)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${colors[plan]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent usage */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Agents les plus utilises</h3>
          <div className="space-y-2">
            {AGENTS.map(agent => {
              const activeCount = allAgents?.filter(a => a.type === agent.type && a.active).length || 0
              return (
                <div key={agent.type} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{agent.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{agent.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{activeCount} actifs</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Activite recente</h3>
          <div className="space-y-2">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.slice(0, 8).map(log => (
                <div key={log.id} className="flex items-start gap-2 py-1">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    log.status === 'success' ? 'bg-green-500' :
                    log.status === 'error' ? 'bg-red-500' :
                    log.status === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 truncate">{log.action}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Aucune activite</p>
            )}
          </div>
        </div>
      </div>

      {/* Clients table */}
      <div className="bg-white rounded-xl shadow-sm" id="clients-section">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tous les clients</h2>
          <Link href="/admin/analytics" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            <Activity className="w-4 h-4" /> Analytics
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Entreprise</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Agents</th>
                <th className="px-6 py-3">Connecteurs</th>
                <th className="px-6 py-3">Onboarding</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients && clients.length > 0 ? (
                clients.map(client => {
                  const clientAgents = allAgents?.filter(a => a.client_id === client.id) || []
                  const clientActiveAgents = clientAgents.filter(a => a.active).length
                  const clientConnectors = allConnectors?.filter(c => c.client_id === client.id) || []
                  const clientActiveConnectors = clientConnectors.filter(c => c.status === 'active').length
                  const clientErrorConnectors = clientConnectors.filter(c => c.status === 'error').length
                  const planLimit = PLAN_AGENTS_LIMIT[client.plan as PlanType]
                  const isOnboarded = !!client.onboarded_at

                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">{client.company_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{client.company_name}</p>
                            <p className="text-xs text-gray-400">{client.phone || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          client.plan === 'full' ? 'bg-purple-100 text-purple-700' :
                          client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {PLAN_LABELS[client.plan as PlanType]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{clientActiveAgents}/{planLimit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-700">{clientActiveConnectors}</span>
                          {clientErrorConnectors > 0 && (
                            <span className="text-xs text-red-500">({clientErrorConnectors} err)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOnboarded ? (
                          <span className="text-xs text-green-600 font-medium">✓ Termine</span>
                        ) : (
                          <Link href={`/admin/onboarding?client=${client.id}`} className="text-xs text-amber-600 font-medium hover:underline">
                            En cours →
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${
                          client.is_active ? 'text-green-600' : 'text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {client.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400">Aucun client pour le moment</p>
                    <Link href="/admin/clients/new" className="text-blue-600 hover:underline text-sm mt-1 inline-block">
                      Creer le premier client
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
