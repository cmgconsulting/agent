import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAgentConfig } from '@/lib/agents-config'
import Link from 'next/link'
import { Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes Agents</h1>
      <p className="text-gray-500 mb-6">Gerez et interagissez avec vos agents IA</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(agents || []).map(agent => {
          const config = getAgentConfig(agent.type)
          const stats = logsByAgent.get(agent.id) || { total: 0, success: 0, error: 0 }
          const pending = pendingByAgent.get(agent.id) || 0

          return (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{config.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{config.role}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  agent.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {agent.active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{config.description}</p>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-900">{stats.total}</span> actions
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-900">{stats.success}</span> succes
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
                      <span className="text-xs text-gray-500">
                        <span className="font-semibold text-red-600">{stats.error}</span> erreurs
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">--</span>
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
