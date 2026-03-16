import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getAgentConfig } from '@/lib/agents-config'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AgentDetailClient } from './agent-detail-client'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import type { AgentType } from '@/types/database'

export default async function AgentDetailPage({ params }: { params: { agentId: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', params.agentId)
    .eq('client_id', client.id)
    .single()

  if (!agent) notFound()

  const config = getAgentConfig(agent.type)

  // Initial data
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: pendingActions } = await supabase
    .from('pending_actions')
    .select('*')
    .eq('agent_id', agent.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <Link href="/dashboard/agents" className="flex items-center gap-2 text-ink-400 hover:text-ink-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour aux agents
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AgentAvatar type={agent.type as AgentType} size="md" />
            <div>
              <h1 className="text-2xl font-bold text-ink-700">{agent.name}</h1>
              <p className="text-ink-400">{config.role} · {config.description}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            agent.active ? 'badge-success' : 'bg-surface-100 text-ink-400'
          }`}>
            {agent.active ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>

      <AgentDetailClient
        agent={agent}
        initialLogs={logs || []}
        initialPendingActions={pendingActions || []}
      />
    </div>
  )
}
