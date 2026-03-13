import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getAgentConfig } from '@/lib/agents-config'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AgentDetailClient } from './agent-detail-client'

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
    <div>
      <Link href="/dashboard/agents" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour aux agents
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{config.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <p className="text-gray-500">{config.role} · {config.description}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            agent.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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
