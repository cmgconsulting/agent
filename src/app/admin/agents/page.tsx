import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AGENTS, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType } from '@/types/database'
import Link from 'next/link'
import { Bot, Users, Zap } from 'lucide-react'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import type { AgentType } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'

export default async function AdminAgentsPage() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/login')

  // Get all clients with their agents
  const { data: clients } = await supabase
    .from('clients')
    .select('*, agents(*)')
    .order('company_name')

  // Compute agent stats across all clients
  const agentStats = AGENTS.map(config => {
    let totalActive = 0
    let totalClients = 0
    for (const client of clients || []) {
      const agents = (client as Record<string, unknown>).agents as Array<Record<string, unknown>> | undefined
      const agent = agents?.find((a) => a.type === config.type)
      if (agent?.active) {
        totalActive++
      }
      totalClients++
    }
    return { ...config, totalActive, totalClients }
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Bot className="w-5 h-5 text-brand-500" />}
        title="Gestion des Agents"
        subtitle="Configuration globale des 8 agents IA"
      />

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {agentStats.map(agent => (
          <div key={agent.type} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AgentAvatar type={agent.type as AgentType} size="sm" />
                <div>
                  <h3 className="text-lg font-bold text-ink-700">{agent.name}</h3>
                  <p className="text-sm text-ink-400">{agent.role}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                agent.category === 'communication'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {agent.category === 'communication' ? 'Communication' : 'Stratégie'}
              </span>
            </div>

            <p className="text-sm text-ink-500 mb-4">{agent.description}</p>

            <div className="flex items-center gap-4 pt-4 border-t border-surface-100">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4 text-ink-300" />
                <span className="text-ink-500">
                  <span className="font-semibold text-ink-700">{agent.totalActive}</span>/{agent.totalClients} clients actifs
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Zap className="w-4 h-4 text-ink-300" />
                <span className="text-ink-500">{agent.connectors.length} connecteurs</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.connectors.map(c => (
                <span key={c} className="px-2 py-0.5 bg-surface-100 text-ink-400 rounded-lg text-xs">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Per-client agent overview */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-ink-400" />
          <h2 className="section-title mb-0">Agents par client</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-3 px-2 font-medium text-ink-400">Client</th>
                <th className="text-left py-3 px-2 font-medium text-ink-400">Plan</th>
                {AGENTS.map(a => (
                  <th key={a.type} className="text-center py-3 px-1 font-medium text-ink-400" title={a.name}>
                    <AgentAvatar type={a.type as AgentType} size="sm" />
                  </th>
                ))}
                <th className="text-right py-3 px-2 font-medium text-ink-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(clients || []).map(client => {
                const agents = (client as Record<string, unknown>).agents as Array<Record<string, unknown>> | undefined
                return (
                  <tr key={client.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-ink-700">{client.company_name}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                        client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {PLAN_LABELS[client.plan as PlanType]}
                      </span>
                    </td>
                    {AGENTS.map(config => {
                      const agent = agents?.find(a => a.type === config.type)
                      return (
                        <td key={config.type} className="text-center py-3 px-1">
                          <span className={`inline-block w-3 h-3 rounded-full ${
                            agent?.active ? 'bg-emerald-500' : 'bg-surface-200'
                          }`} title={`${config.name}: ${agent?.active ? 'Actif' : 'Inactif'}`} />
                        </td>
                      )
                    })}
                    <td className="py-3 px-2 text-right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
