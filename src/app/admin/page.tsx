import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Users, Bot, Plug, AlertTriangle, Activity, DollarSign, Zap, Clock } from 'lucide-react'
import Link from 'next/link'
import { AGENTS, PLAN_LABELS, PLAN_AGENTS_LIMIT } from '@/lib/agents-config'
import type { PlanType, AgentType } from '@/types/database'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient()

  // Date helpers
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Fetch all data in parallel
  const [
    { data: clients },
    { data: allAgents },
    { data: allConnectors },
    { data: recentLogs },
    { data: pendingActions },
    { data: subscriptions },
    { data: tokenData },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('agents').select('*'),
    supabase.from('connectors').select('*'),
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('pending_actions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('client_subscriptions').select('*, billing_plans:plan_id(price_monthly, display_name)').in('status', ['active', 'trial']),
    supabase.from('token_usage_daily').select('total_tokens, total_cost').gte('date', monthStart),
  ])

  const totalClients = clients?.length || 0
  const activeClients = clients?.filter(c => c.is_active).length || 0
  const totalAgentsActive = allAgents?.filter(a => a.active).length || 0
  const totalConnectors = allConnectors?.filter(c => c.status === 'active').length || 0
  const errorConnectors = allConnectors?.filter(c => c.status === 'error').length || 0
  const pendingCount = pendingActions?.length || 0

  // Calculate tokens used this month from token_usage_daily
  const tokensThisMonth = tokenData?.reduce((sum, d) => sum + (d.total_tokens || 0), 0) || 0

  // Plan distribution
  const planCounts = { starter: 0, pro: 0, enterprise: 0 }
  clients?.forEach(c => {
    if (c.plan in planCounts) planCounts[c.plan as PlanType]++
  })

  // Real MRR from client_subscriptions + billing_plans
  const mrr = subscriptions?.reduce((sum, sub) => {
    const plan = sub.billing_plans as Record<string, unknown> | null
    return sum + (Number(plan?.price_monthly) || 0)
  }, 0) || 0
  // Fallback plan prices for display in plan distribution
  const planPrices = { starter: 29, pro: 79, enterprise: 199 }

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
  const notOnboarded = clients?.filter(c => !c.onboarded_at) || []
  if (notOnboarded.length > 0) {
    alerts.push({ type: 'info', message: `${notOnboarded.length} client(s) pas encore onboardé(s)` })
  }

  const stats = [
    { label: 'MRR estimé', value: `${mrr.toLocaleString('fr-FR')} €`, icon: <DollarSign className="w-5 h-5 text-brand-500" />, color: 'bg-emerald-50', iconColor: 'text-emerald-500', trend: null },
    { label: 'Clients actifs', value: `${activeClients}/${totalClients}`, icon: <Users className="w-5 h-5 text-brand-500" />, color: 'bg-blue-50', iconColor: 'text-blue-500', trend: null },
    { label: 'Agents actifs', value: totalAgentsActive, icon: <Bot className="w-5 h-5 text-brand-500" />, color: 'bg-purple-50', iconColor: 'text-purple-500', trend: null },
    { label: 'Connecteurs OK', value: totalConnectors, icon: <Plug className="w-5 h-5 text-brand-500" />, color: 'bg-orange-50', iconColor: 'text-orange-500', trend: errorConnectors > 0 ? `${errorConnectors} erreur(s)` : null },
    { label: 'Tokens (mois)', value: tokensThisMonth > 1000 ? `${Math.round(tokensThisMonth / 1000)}k` : tokensThisMonth, icon: <Zap className="w-5 h-5 text-brand-500" />, color: 'bg-brand-50', iconColor: 'text-brand-500', trend: null },
    { label: 'Actions en attente', value: pendingCount, icon: <Clock className="w-5 h-5 text-brand-500" />, color: pendingCount > 0 ? 'bg-amber-50' : 'bg-surface-100', iconColor: pendingCount > 0 ? 'text-amber-500' : 'text-ink-300', trend: null },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Activity className="w-5 h-5 text-brand-500" />}
        title="Dashboard Admin"
        subtitle="Vue d'ensemble de la plateforme CMG Agents"
        action={{ label: '+ Nouveau client', href: '/admin/clients/new' }}
      />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              alert.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              alert.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-brand-50 text-brand-700 border border-brand-200'
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
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            helpText={stat.trend || undefined}
          />
        ))}
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Répartition par plan</h3>
          <div className="space-y-3">
            {(['starter', 'pro', 'enterprise'] as PlanType[]).map(plan => {
              const count = planCounts[plan]
              const pct = totalClients > 0 ? (count / totalClients) * 100 : 0
              const colors = { starter: 'bg-emerald-400', pro: 'bg-blue-500', enterprise: 'bg-purple-500' }
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-ink-600">{PLAN_LABELS[plan]}</span>
                    <span className="text-ink-400">{count} clients ({planPrices[plan]}€/mois)</span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className={`${colors[plan]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent usage */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Agents les plus utilisés</h3>
          <div className="space-y-2">
            {AGENTS.map(agent => {
              const activeCount = allAgents?.filter(a => a.type === agent.type && a.active).length || 0
              return (
                <div key={agent.type} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <AgentAvatar type={agent.type as AgentType} size="sm" />
                    <span className="text-sm font-medium text-ink-600">{agent.name}</span>
                  </div>
                  <span className="text-sm text-ink-400">{activeCount} actifs</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Activité récente</h3>
          <div className="space-y-2">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.slice(0, 8).map(log => (
                <div key={log.id} className="flex items-start gap-2 py-1">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    log.status === 'success' ? 'bg-emerald-500' :
                    log.status === 'error' ? 'bg-red-500' :
                    log.status === 'warning' ? 'bg-amber-500' :
                    'bg-brand-400'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-600 truncate">{log.action}</p>
                    <p className="text-xs text-ink-300">
                      {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-300 text-center py-4">Aucune activité</p>
            )}
          </div>
        </div>
      </div>

      {/* Clients table */}
      <div className="card p-0" id="clients-section">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 className="section-title mb-0">Tous les clients</h2>
          <Link href="/admin/analytics" className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1 transition-colors">
            <Activity className="w-4 h-4" /> Analytics
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-ink-400 uppercase tracking-wider border-b border-surface-100">
                <th className="px-6 py-3">Entreprise</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Agents</th>
                <th className="px-6 py-3">Connecteurs</th>
                <th className="px-6 py-3">Onboarding</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
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
                    <tr key={client.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                            <span className="text-brand-600 font-bold text-sm">{client.company_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-ink-700 text-sm">{client.company_name}</p>
                            <p className="text-xs text-ink-300">{client.phone || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          client.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                          client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {PLAN_LABELS[client.plan as PlanType]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-ink-600">{clientActiveAgents}/{planLimit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-ink-600">{clientActiveConnectors}</span>
                          {clientErrorConnectors > 0 && (
                            <span className="text-xs text-red-500">({clientErrorConnectors} err)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOnboarded ? (
                          <span className="text-xs text-emerald-600 font-medium">Terminé</span>
                        ) : (
                          <Link href={`/admin/onboarding?client=${client.id}`} className="text-xs text-amber-600 font-medium hover:underline">
                            En cours
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${
                          client.is_active ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {client.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="text-brand-500 hover:text-brand-600 text-sm font-medium transition-colors"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-surface-200" />
                    <p className="text-ink-300">Aucun client pour le moment</p>
                    <Link href="/admin/clients/new" className="text-brand-500 hover:text-brand-600 text-sm mt-1 inline-block font-medium">
                      Créer le premier client
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
