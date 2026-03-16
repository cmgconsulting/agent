import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bot, Plug, Calendar, Building2, FileText, Download, Palette } from 'lucide-react'
import Link from 'next/link'
import { AGENTS, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType, AgentType } from '@/types/database'
import { AgentAvatar } from '@/components/agents/agent-avatars'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', client.user_id)
    .single()

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('client_id', client.id)
    .order('type')

  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('client_id', client.id)

  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="animate-fade-in">
      <Link href="/admin" className="flex items-center gap-2 text-ink-400 hover:text-ink-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink-700">{client.company_name}</h1>
              <p className="text-ink-400">{profile?.email} &middot; {profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/clients/${params.id}/prompts`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
            >
              <FileText className="w-4 h-4" /> Prompts
            </Link>
            <Link
              href={`/admin/clients/${params.id}/branding`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-pink-700 bg-pink-50 hover:bg-pink-100 transition"
            >
              <Palette className="w-4 h-4" /> Branding
            </Link>
            <a
              href={`/api/admin/clients/${params.id}/logs/export`}
              className="btn-secondary text-sm py-1.5"
            >
              <Download className="w-4 h-4" /> Export CSV
            </a>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              client.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
              client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {PLAN_LABELS[client.plan as PlanType]}
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
              client.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${client.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {client.is_active ? 'Actif' : 'Suspendu'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-surface-100">
          <div>
            <p className="text-sm text-ink-400">Téléphone</p>
            <p className="font-medium text-ink-700">{client.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-ink-400">SIRET</p>
            <p className="font-medium text-ink-700">{client.siret || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-ink-400">Adresse</p>
            <p className="font-medium text-ink-700">{client.address || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-ink-400">Créé le</p>
            <p className="font-medium text-ink-700">
              {new Date(client.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-ink-400" />
            <h2 className="section-title">Agents</h2>
          </div>
          <div className="space-y-3">
            {agents?.map((agent) => {
              const config = AGENTS.find(a => a.type === agent.type)
              return (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
                  <div className="flex items-center gap-3">
                    <AgentAvatar type={agent.type as AgentType} size="sm" />
                    <div>
                      <p className="font-medium text-ink-700">{agent.name}</p>
                      <p className="text-xs text-ink-400">{config?.role}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    agent.active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-ink-400'
                  }`}>
                    {agent.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Connectors */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plug className="w-5 h-5 text-ink-400" />
              <h2 className="section-title">Connecteurs</h2>
            </div>
            <Link
              href={`/admin/clients/${params.id}/connectors`}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Gérer &rarr;
            </Link>
          </div>
          {connectors && connectors.length > 0 ? (
            <div className="space-y-3">
              {connectors.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
                  <div>
                    <p className="font-medium text-ink-700 capitalize">{conn.type.replace('_', ' ')}</p>
                    <p className="text-xs text-ink-400">{conn.label || conn.type}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    conn.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    conn.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-surface-100 text-ink-400'
                  }`}>
                    {conn.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 text-sm py-4 text-center">Aucun connecteur configuré</p>
          )}
        </div>

        {/* Recent logs */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-ink-400" />
            <h2 className="section-title">Activité récente</h2>
          </div>
          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-50">
                  <span className={`w-2 h-2 rounded-full ${
                    log.status === 'success' ? 'bg-emerald-500' :
                    log.status === 'error' ? 'bg-red-500' :
                    log.status === 'warning' ? 'bg-amber-500' :
                    'bg-brand-400'
                  }`} />
                  <p className="flex-1 text-sm text-ink-600">{log.action}</p>
                  <p className="text-xs text-ink-400">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 text-sm py-4 text-center">Aucune activité enregistrée</p>
          )}
        </div>
      </div>
    </div>
  )
}
