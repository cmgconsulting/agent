import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AGENTS } from '@/lib/agents-config'
import { Clock, CheckCircle, XCircle, Activity, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { AgentType } from '@/types/database'

export default async function ClientDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get client data
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Compte en cours de configuration</h2>
          <p className="text-gray-500 mt-2">Votre administrateur configure votre espace.</p>
        </div>
      </div>
    )
  }

  // Get agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('client_id', client.id)

  // Get pending actions
  const { data: pendingActions } = await supabase
    .from('pending_actions')
    .select('*')
    .eq('client_id', client.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get recent logs
  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Weekly stats
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const weeklyLogs = recentLogs?.filter(l => new Date(l.created_at) > oneWeekAgo) || []
  const weeklySuccess = weeklyLogs.filter(l => l.status === 'success').length
  const weeklyErrors = weeklyLogs.filter(l => l.status === 'error').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, bienvenue chez {client.company_name}
        </h1>
        <p className="text-gray-500">Voici l&apos;activite de vos agents IA cette semaine</p>
      </div>

      {/* Onboarding score banner */}
      {(client as Record<string, unknown>).onboarding_score !== undefined &&
       ((client as Record<string, unknown>).onboarding_score as number) < 80 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 text-sm">Onboarding incomplet — {(client as Record<string, unknown>).onboarding_score as number}%</h3>
              <p className="text-orange-700 text-sm mt-1">
                Vos agents seront actives a partir de 80%. Completez les informations manquantes pour que vos agents soient performants.
              </p>
              <Link href="/dashboard/onboarding"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-orange-700 hover:text-orange-900 underline">
                Completer l&apos;onboarding →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">Actions cette semaine</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{weeklyLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">Reussies</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{weeklySuccess}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-500">Erreurs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{weeklyErrors}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-500">En attente</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{pendingActions?.length || 0}</p>
        </div>
      </div>

      {/* Agent cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vos Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS.map((agentConfig) => {
            const agent = agents?.find(a => a.type === agentConfig.type)
            const isActive = agent?.active || false
            const agentLogs = recentLogs?.filter(l => l.agent_id === agent?.id) || []

            return (
              <div
                key={agentConfig.type}
                className={`bg-white rounded-xl shadow-sm p-5 border-2 transition ${
                  isActive ? 'border-transparent' : 'border-transparent opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{agentConfig.icon}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{agentConfig.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{agentConfig.role}</p>
                {isActive && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Activity className="w-3.5 h-3.5" />
                    {agentLogs.length} actions cette semaine
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending actions */}
      {pendingActions && pendingActions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Actions en attente de validation
          </h2>
          <div className="space-y-3">
            {pendingActions.map((action) => {
              const agentConfig = AGENTS.find(a => {
                const ag = agents?.find(ag => ag.id === action.agent_id)
                return ag && a.type === (ag.type as AgentType)
              })
              return (
                <div key={action.id} className="flex items-center justify-between p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{agentConfig?.icon || '🤖'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{action.title}</p>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={`/api/actions/${action.id}/approve`} method="POST">
                      <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                        Valider
                      </button>
                    </form>
                    <form action={`/api/actions/${action.id}/reject`} method="POST">
                      <button className="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition">
                        Refuser
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activite recente</h2>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  log.status === 'success' ? 'bg-green-500' :
                  log.status === 'error' ? 'bg-red-500' :
                  log.status === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <p className="flex-1 text-sm text-gray-700">{log.action}</p>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">
            Aucune activite pour le moment. Vos agents commenceront bientot a travailler.
          </p>
        )}
      </div>
    </div>
  )
}
