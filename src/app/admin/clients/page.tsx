import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PLAN_LABELS, PLAN_AGENTS_LIMIT } from '@/lib/agents-config'
import type { PlanType } from '@/types/database'
import { Users, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ClientsListPage() {
  const supabase = createServerSupabaseClient()

  const [
    { data: clients },
    { data: allAgents },
    { data: allConnectors },
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('agents').select('id, type, client_id, active'),
    supabase.from('connectors').select('id, type, client_id, status'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">{clients?.length || 0} clients enregistres</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Nouveau client
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Entreprise</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Agents</th>
                <th className="px-6 py-3">Connecteurs</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Cree le</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients && clients.length > 0 ? (
                clients.map(client => {
                  const clientActiveAgents = allAgents?.filter(a => a.client_id === client.id && a.active).length || 0
                  const clientConnectors = allConnectors?.filter(c => c.client_id === client.id && c.status === 'active').length || 0
                  const planLimit = PLAN_AGENTS_LIMIT[client.plan as PlanType]

                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">{client.company_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{client.company_name}</p>
                            <p className="text-xs text-gray-400">{client.siret || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          client.plan === 'full' ? 'bg-purple-100 text-purple-700' :
                          client.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {PLAN_LABELS[client.plan as PlanType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{clientActiveAgents}/{planLimit}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{clientConnectors}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${
                          client.is_active ? 'text-green-600' : 'text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {client.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/admin/clients/${client.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Voir &rarr;
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400">Aucun client</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
