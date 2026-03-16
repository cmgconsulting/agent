import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAgentConfig } from '@/lib/agents-config'
import Link from 'next/link'
import { Activity, CheckCircle2, AlertCircle, Clock, Bot } from 'lucide-react'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import { PageHeader } from '@/components/ui/page-header'
import { SectionHelp } from '@/components/ui/help-tooltip'
import type { AgentType } from '@/types/database'

export default async function ClientAgentsPage() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) redirect('/login')

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('client_id', client.id)
    .order('type')

  // Get recent logs and pending actions counts per agent
  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('agent_id, status')
    .eq('client_id', client.id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const { data: pendingActions } = await supabase
    .from('pending_actions')
    .select('agent_id')
    .eq('client_id', client.id)
    .eq('status', 'pending')

  // Aggregate stats per agent
  const logsByAgent = new Map<string, { total: number; success: number; error: number }>()
  for (const log of recentLogs || []) {
    const stats = logsByAgent.get(log.agent_id) || { total: 0, success: 0, error: 0 }
    stats.total++
    if (log.status === 'success') stats.success++
    if (log.status === 'error') stats.error++
    logsByAgent.set(log.agent_id, stats)
  }

  const pendingByAgent = new Map<string, number>()
  for (const action of pendingActions || []) {
    pendingByAgent.set(action.agent_id, (pendingByAgent.get(action.agent_id) || 0) + 1)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Bot}
        title="Mes Agents"
        subtitle="Vos assistants IA travaillent pour vous au quotidien"
      />

      <div className="mb-6">
        <SectionHelp
          title="Vos agents IA"
          description="Chaque agent est spécialisé dans un domaine. Cliquez sur un agent pour discuter avec lui ou voir son activité."
          tips={[
            "Cliquez sur un agent pour lui parler directement",
            "Le compteur 'actions' montre le travail effectué cette semaine",
            "Les agents inactifs peuvent être activés par votre administrateur",
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(agents || []).map((agent, idx) => {
          const config = getAgentConfig(agent.type)
          const stats = logsByAgent.get(agent.id) || { total: 0, success: 0, error: 0 }
          const pending = pendingByAgent.get(agent.id) || 0

          return (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="card-interactive animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <AgentAvatar type={agent.type as AgentType} size="sm" />
                  <div>
                    <h3 className="text-lg font-bold text-ink-700">{agent.name}</h3>
                    <p className="text-sm text-ink-400">{config.role}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  agent.active ? 'badge-success' : 'bg-surface-100 text-ink-400'
                }`}>
                  {agent.active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <p className="text-sm text-ink-500 mb-4">{config.description}</p>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-100">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-xs text-ink-400">
                    <span className="font-semibold text-ink-700">{stats.total}</span> actions
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-ink-400">
                    <span className="font-semibold text-ink-700">{stats.success}</span> succès
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {pending > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs text-orange-600 font-semibold">{pending} en attente</span>
                    </>
                  ) : stats.error > 0 ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs text-ink-400">
                        <span className="font-semibold text-red-600">{stats.error}</span> erreurs
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-ink-300">--</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
