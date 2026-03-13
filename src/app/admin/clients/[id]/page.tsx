import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bot, Plug, Calendar, Building2, FileText, Download, Palette } from 'lucide-react'
import Link from 'next/link'
import { AGENTS, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType } from '@/types/database'

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
    <div>
      <Link href="/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.company_name}</h1>
              <p className="text-gray-500">{profile?.email} &middot; {profile?.full_name}</p>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </a>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              client.plan === 'full' ? 'bg-purple-100 text-purple-700' :
              client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {PLAN_LABELS[client.plan as PlanType]}
            </span>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
              client.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${client.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              {client.is_active ? 'Actif' : 'Suspendu'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">Telephone</p>
            <p className="font-medium text-gray-900">{client.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">SIRET</p>
            <p className="font-medium text-gray-900">{client.siret || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Adresse</p>
            <p className="font-medium text-gray-900">{client.address || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cree le</p>
            <p className="font-medium text-gray-900">
              {new Date(client.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
          </div>
          <div className="space-y-3">
            {agents?.map((agent) => {
              const config = AGENTS.find(a => a.type === agent.type)
              return (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{config?.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{config?.role}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    agent.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {agent.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Connectors */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plug className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Connecteurs</h2>
            </div>
            <Link
              href={`/admin/clients/${params.id}/connectors`}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Gerer &rarr;
            </Link>
          </div>
          {connectors && connectors.length > 0 ? (
            <div className="space-y-3">
              {connectors.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{conn.type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">{conn.label || conn.type}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    conn.status === 'active' ? 'bg-green-100 text-green-700' :
                    conn.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {conn.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4 text-center">Aucun connecteur configure</p>
          )}
        </div>

        {/* Recent logs */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Activite recente</h2>
          </div>
          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                  <span className={`w-2 h-2 rounded-full ${
                    log.status === 'success' ? 'bg-green-500' :
                    log.status === 'error' ? 'bg-red-500' :
                    log.status === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <p className="flex-1 text-sm text-gray-700">{log.action}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4 text-center">Aucune activite enregistree</p>
          )}
        </div>
      </div>
    </div>
  )
}
