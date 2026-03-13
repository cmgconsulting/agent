import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AGENTS, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType } from '@/types/database'
import Link from 'next/link'
import { Bot, Users, Zap } from 'lucide-react'

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Agents</h1>
          <p className="text-gray-500">Configuration globale des 8 agents IA</p>
        </div>
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {agentStats.map(agent => (
          <div key={agent.type} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-500">{agent.role}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                agent.category === 'communication'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {agent.category === 'communication' ? 'Communication' : 'Strategie'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{agent.description}</p>

            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{agent.totalActive}</span>/{agent.totalClients} clients actifs
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{agent.connectors.length} connecteurs</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.connectors.map(c => (
                <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Per-client agent overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Agents par client</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 font-medium text-gray-500">Client</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Plan</th>
                {AGENTS.map(a => (
                  <th key={a.type} className="text-center py-3 px-1 font-medium text-gray-500" title={a.name}>
                    {a.icon}
                  </th>
                ))}
                <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(clients || []).map(client => {
                const agents = (client as Record<string, unknown>).agents as Array<Record<string, unknown>> | undefined
                return (
                  <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{client.company_name}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.plan === 'full' ? 'bg-purple-100 text-purple-700' :
                        client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {PLAN_LABELS[client.plan as PlanType]}
                      </span>
                    </td>
                    {AGENTS.map(config => {
                      const agent = agents?.find(a => a.type === config.type)
                      return (
                        <td key={config.type} className="text-center py-3 px-1">
                          <span className={`inline-block w-3 h-3 rounded-full ${
                            agent?.active ? 'bg-green-500' : 'bg-gray-200'
                          }`} title={`${config.name}: ${agent?.active ? 'Actif' : 'Inactif'}`} />
                        </td>
                      )
                    })}
                    <td className="py-3 px-2 text-right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
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
