import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AGENTS } from '@/lib/agents-config'
import {
  Clock, CheckCircle, XCircle, Activity, AlertTriangle,
  ArrowRight, Sparkles, Bot
} from 'lucide-react'
import Link from 'next/link'
import type { AgentType } from '@/types/database'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DashboardTourWrapper } from '@/components/ui/guided-tour'

export default async function ClientDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-ink-700">Votre espace est en préparation</h2>
        <p className="text-ink-300 mt-2 text-center max-w-md">
          Votre administrateur CMG Consulting est en train de configurer votre espace.
          Vous recevrez un email dès que tout sera prêt.
        </p>
      </div>
    )
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('client_id', client.id)

  const { data: pendingActions } = await supabase
    .from('pending_actions')
    .select('*')
    .eq('client_id', client.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const weeklyLogs = recentLogs?.filter(l => new Date(l.created_at) > oneWeekAgo) || []
  const weeklySuccess = weeklyLogs.filter(l => l.status === 'success').length
  const weeklyErrors = weeklyLogs.filter(l => l.status === 'error').length

  const firstName = (client.company_name || '').split(' ')[0]

  return (
    <div className="animate-fade-in">
      <PageHeader
        greeting={`Bonjour ${firstName}`}
        title="Votre tableau de bord"
        subtitle="Voici ce que vos agents IA ont fait pour vous cette semaine"
      />

      {/* Onboarding banner */}
      {(client as Record<string, unknown>).onboarding_score !== undefined &&
       ((client as Record<string, unknown>).onboarding_score as number) < 80 && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 mb-6 animate-slide-up">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-ink-700 text-sm">
                Configuration à compléter — {(client as Record<string, unknown>).onboarding_score as number}%
              </h3>
              <p className="text-ink-400 text-sm mt-1">
                Pour que vos agents soient performants, complétez les informations sur votre entreprise.
                C&apos;est rapide et ça change tout !
              </p>
              <Link
                href="/dashboard/onboarding"
                className="inline-flex items-center gap-2 mt-3 bg-brand-400 text-ink-700 font-semibold text-sm py-2 px-4 rounded-xl hover:bg-brand-500 transition-colors"
              >
                Compléter la configuration
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Activity}
          label="Actions cette semaine"
          value={weeklyLogs.length}
          color="blue"
          helpText="Nombre total d'actions de vos agents ces 7 derniers jours"
        />
        <StatCard
          icon={CheckCircle}
          label="Réussies"
          value={weeklySuccess}
          color="green"
        />
        <StatCard
          icon={XCircle}
          label="Erreurs"
          value={weeklyErrors}
          color="red"
        />
        <StatCard
          icon={Clock}
          label="En attente de validation"
          value={pendingActions?.length || 0}
          color="orange"
          helpText="Actions proposées par vos agents qui nécessitent votre accord"
        />
      </div>

      {/* Agent cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-500" />
            </div>
            <h2 className="text-lg font-bold text-ink-700">Vos Agents IA</h2>
          </div>
          <Link href="/dashboard/agents" className="text-sm text-ink-300 hover:text-brand-500 font-medium flex items-center gap-1 transition-colors">
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="agent-cards">
          {AGENTS.map((agentConfig, idx) => {
            const agent = agents?.find(a => a.type === agentConfig.type)
            const isActive = agent?.active || false
            const agentLogs = recentLogs?.filter(l => l.agent_id === agent?.id) || []

            return (
              <Link
                key={agentConfig.type}
                href={agent ? `/dashboard/agents/${agent.id}` : '/dashboard/agents'}
                className={`bg-white rounded-2xl shadow-soft p-5 border border-surface-100 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 cursor-pointer animate-slide-up ${
                  !isActive ? 'opacity-50' : ''
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <AgentAvatar type={agentConfig.type as AgentType} size="sm" />
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-ink-300'
                  }`}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <h3 className="font-bold text-ink-700">{agentConfig.name}</h3>
                <p className="text-xs text-ink-300 mb-3">{agentConfig.role}</p>
                {isActive && (
                  <div className="flex items-center gap-2 text-xs text-ink-200 pt-3 border-t border-surface-100">
                    <Activity className="w-3.5 h-3.5" />
                    {agentLogs.length} action{agentLogs.length !== 1 ? 's' : ''} cette semaine
                  </div>
                )}
                {!isActive && (
                  <p className="text-xs text-ink-200 pt-3 border-t border-surface-100">
                    Activez cet agent pour commencer
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pending actions */}
      {pendingActions && pendingActions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-soft border border-surface-100 p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-ink-700">Actions en attente</h2>
              <p className="text-xs text-ink-300">Validez ou refusez les propositions de vos agents</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingActions.map((action) => {
              const agentConfig = AGENTS.find(a => {
                const ag = agents?.find(ag => ag.id === action.agent_id)
                return ag && a.type === (ag.type as AgentType)
              })
              return (
                <div key={action.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="flex items-center gap-3">
                    {agentConfig ? (
                      <AgentAvatar type={agentConfig.type as AgentType} size="sm" />
                    ) : (
                      <Bot className="w-6 h-6 text-ink-300" />
                    )}
                    <div>
                      <p className="font-semibold text-ink-700 text-sm">{action.title}</p>
                      <p className="text-xs text-ink-300">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={`/api/actions/${action.id}/approve`} method="POST">
                      <button className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-xl font-medium hover:bg-emerald-600 transition-colors">
                        ✓ Valider
                      </button>
                    </form>
                    <form action={`/api/actions/${action.id}/reject`} method="POST">
                      <button className="px-4 py-2 bg-surface-100 text-ink-400 text-sm rounded-xl font-medium hover:bg-red-50 hover:text-red-500 transition-colors">
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
      <div className="bg-white rounded-2xl shadow-soft border border-surface-100 p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-ink-700">Activité récente</h2>
            <p className="text-xs text-ink-300">Ce que vos agents ont fait dernièrement</p>
          </div>
        </div>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="space-y-1">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 transition-colors">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  log.status === 'success' ? 'bg-emerald-400' :
                  log.status === 'error' ? 'bg-red-400' :
                  log.status === 'warning' ? 'bg-amber-400' :
                  'bg-blue-400'
                }`} />
                <p className="flex-1 text-sm text-ink-500">{log.action}</p>
                <p className="text-xs text-ink-200 flex-shrink-0">
                  {new Date(log.created_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Pas encore d'activité"
            description="Vos agents commenceront bientôt à travailler pour vous !"
            illustration="rocket"
          />
        )}
      </div>

      {/* Guided tour — first login */}
      <DashboardTourWrapper />
    </div>
  )
}
