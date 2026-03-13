import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConnectorConfig } from '@/lib/connectors-config'
import { Wifi, WifiOff, AlertTriangle, Plug } from 'lucide-react'

export default async function ClientConnectorsPage() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client') redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) redirect('/login')

  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const statusConfig = {
    active: { label: 'Actif', color: 'bg-green-100 text-green-700', Icon: Wifi },
    inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-500', Icon: WifiOff },
    error: { label: 'Erreur', color: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Connecteurs</h1>
      <p className="text-gray-500 mb-6">Vos integrations actives</p>

      {connectors && connectors.length > 0 ? (
        <div className="grid gap-4">
          {connectors.map(connector => {
            const config = getConnectorConfig(connector.type)
            const status = statusConfig[connector.status as keyof typeof statusConfig] || statusConfig.inactive
            const StatusIcon = status.Icon
            return (
              <div key={connector.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{config?.icon || '🔌'}</span>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{config?.label || connector.type}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{config?.category}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Plug className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun connecteur</h3>
          <p className="text-gray-400">Contactez votre administrateur pour configurer vos integrations</p>
        </div>
      )}
    </div>
  )
}
