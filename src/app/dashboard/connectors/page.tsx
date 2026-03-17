'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CONNECTORS, CONNECTOR_CATEGORIES } from '@/lib/connectors-config'
import type { ConnectorConfig } from '@/lib/connectors-config'
import type { ConnectorType, ConnectorStatus } from '@/types/database'
import { ConnectionWizard } from '@/components/connectors/connection-wizard'
import { Plug, Wifi, WifiOff, AlertTriangle, Search } from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'

interface ConnectorRecord {
  id: string
  type: ConnectorType
  status: ConnectorStatus
  last_tested_at: string | null
}

export default function ClientConnectorsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardConnector, setWizardConnector] = useState<ConnectorConfig | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  const loadConnectors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) { router.push('/login'); return }

    const { data } = await supabase
      .from('connectors')
      .select('id, type, status, last_tested_at')
      .eq('client_id', client.id)

    setConnectors((data as ConnectorRecord[]) || [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    loadConnectors()
  }, [loadConnectors])

  // Check URL for ?connected=type (OAuth callback success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    if (connected) {
      // Reload connectors to show updated status
      loadConnectors()
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/connectors')
    }
  }, [loadConnectors])

  function getConnectorStatus(type: ConnectorType): ConnectorRecord | undefined {
    return connectors.find(c => c.type === type)
  }

  const statusConfig = {
    active: { label: 'Connecte', className: 'badge-success', Icon: Wifi },
    inactive: { label: 'Inactif', className: 'bg-surface-100 text-ink-400', Icon: WifiOff },
    error: { label: 'Erreur', className: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  }

  // Filter connectors
  const filteredConnectors = CONNECTORS.filter(c => {
    if (filterCategory !== 'all' && c.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    }
    return true
  })

  // Group by category
  const grouped = filteredConnectors.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {} as Record<string, ConnectorConfig[]>)

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-8 w-48 bg-surface-100 rounded-lg animate-pulse mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card h-32 animate-pulse bg-surface-50" />
          ))}
        </div>
      </div>
    )
  }

  const connectedCount = connectors.filter(c => c.status === 'active').length

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Plug className="w-5 h-5 text-brand-500" />}
        title="Connexions"
        subtitle={`${connectedCount} service${connectedCount > 1 ? 's' : ''} connecte${connectedCount > 1 ? 's' : ''} sur ${CONNECTORS.length} disponibles`}
      />

      <div className="mb-6">
        <SectionHelp
          title="Connectez vos outils en quelques clics"
          description="Vos agents IA ont besoin d'acceder a vos logiciels pour travailler. Connectez vos outils ici pour qu'ils puissent agir a votre place."
          tips={[
            'Cliquez sur "Connecter" et suivez les etapes — c\'est simple et rapide',
            'Vos identifiants sont chiffres et securises, jamais partages',
            'Chaque outil est lie a un agent specifique (Marc pour les emails, Eva pour les reseaux sociaux...)',
          ]}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un outil..."
            className="input w-full pl-10"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="input w-full sm:w-auto"
        >
          <option value="all">Toutes les categories</option>
          {CONNECTOR_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Connectors grid grouped by category */}
      {Object.entries(grouped).map(([category, configs]) => (
        <div key={category} className="mb-6">
          <h3 className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-3">{category}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {configs.map(config => {
              const record = getConnectorStatus(config.type)
              const isConnected = record?.status === 'active'
              const hasError = record?.status === 'error'
              const status = record ? statusConfig[record.status as keyof typeof statusConfig] : null
              const StatusIcon = status?.Icon

              return (
                <div
                  key={config.type}
                  className={`card flex flex-col justify-between transition-all duration-200 ${
                    isConnected ? 'ring-1 ring-emerald-200' : hasError ? 'ring-1 ring-red-200' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-ink-700 text-sm">{config.label}</h4>
                        {status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.className}`}>
                            {StatusIcon && <StatusIcon className="w-3 h-3" />}
                            {status.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-300 mt-0.5">{config.category}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setWizardConnector(config)}
                    className={`w-full text-sm font-medium py-2 rounded-xl transition-colors ${
                      isConnected
                        ? 'btn-secondary'
                        : hasError
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'btn-brand'
                    }`}
                  >
                    {isConnected ? 'Gerer' : hasError ? 'Reconnecter' : 'Connecter'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {filteredConnectors.length === 0 && (
        <div className="text-center py-12 text-ink-300">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun connecteur ne correspond a votre recherche.</p>
        </div>
      )}

      {/* Connection Wizard Modal */}
      {wizardConnector && (
        <ConnectionWizard
          connector={wizardConnector}
          currentStatus={getConnectorStatus(wizardConnector.type)?.status}
          onSuccess={() => loadConnectors()}
          onClose={() => setWizardConnector(null)}
        />
      )}
    </div>
  )
}
