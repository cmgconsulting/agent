'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { CRMConnectorCard } from '@/components/crm/crm-connector-card'
import { CRMConnectionModal } from '@/components/crm/crm-connection-modal'
import { CRM_CONFIGS, type CRMConfig } from '@/lib/crm/types'

interface CRMConnection {
  id: string
  crm_type: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  config: Record<string, { enabled: boolean; direction: string; frequency: string }>
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_details: Record<string, unknown>
}

interface SyncLog {
  id: string
  sync_type: string
  direction: string
  status: string
  items_synced: number
  items_failed: number
  created_at: string
  completed_at: string | null
}

export default function CRMSettingsPage() {
  const [connections, setConnections] = useState<CRMConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCRM, setSelectedCRM] = useState<CRMConfig | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/crm')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const getConnectionForType = (type: string): CRMConnection | undefined => {
    return connections.find(c => c.crm_type === type)
  }

  const getStatusForType = (type: string): CRMConnection['status'] => {
    return getConnectionForType(type)?.status || 'disconnected'
  }

  const openModal = (crm: CRMConfig) => {
    setSelectedCRM(crm)
    setModalOpen(true)

    // Fetch sync logs if connected
    const connection = getConnectionForType(crm.type)
    if (connection?.id) {
      fetch(`/api/crm/sync?connection_id=${connection.id}`)
        .then(res => res.json())
        .then(data => setSyncLogs(data.logs || []))
        .catch(() => setSyncLogs([]))
    } else {
      setSyncLogs([])
    }
  }

  const handleConnect = async (credentials: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
    if (!selectedCRM) return { success: false, error: 'CRM non selectionne' }

    const res = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm_type: selectedCRM.type, credentials }),
    })
    const data = await res.json()

    if (data.success) {
      await fetchConnections()
    }
    return data
  }

  const handleDisconnect = async () => {
    if (!selectedCRM) return

    await fetch(`/api/crm?crm_type=${selectedCRM.type}`, { method: 'DELETE' })
    await fetchConnections()
  }

  const handleTest = async (): Promise<{ success: boolean; error?: string }> => {
    if (!selectedCRM) return { success: false, error: 'CRM non selectionne' }

    const res = await fetch('/api/crm/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm_type: selectedCRM.type }),
    })
    return res.json()
  }

  const handleSyncNow = async () => {
    if (!selectedCRM) return

    await fetch('/api/crm/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm_type: selectedCRM.type }),
    })
    await fetchConnections()

    // Refresh logs
    const connection = getConnectionForType(selectedCRM.type)
    if (connection?.id) {
      const res = await fetch(`/api/crm/sync?connection_id=${connection.id}`)
      const data = await res.json()
      setSyncLogs(data.logs || [])
    }
  }

  const handleUpdateConfig = async (config: Record<string, unknown>) => {
    if (!selectedCRM) return

    await fetch('/api/crm', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm_type: selectedCRM.type, config }),
    })
    await fetchConnections()
  }

  const selectedConnection = selectedCRM ? getConnectionForType(selectedCRM.type) : undefined

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Connecteurs CRM"
        subtitle="Connectez votre logiciel de gestion pour synchroniser contacts, devis et factures avec vos agents IA"
        icon={Link2}
      />

      <div className="mb-6">
        <SectionHelp
          title="Connecteurs CRM"
          description="Connectez votre CRM ou logiciel de gestion pour permettre a vos agents d'acceder a vos contacts, devis, factures et chantiers. Les donnees sont synchronisees de maniere securisee et chiffree."
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-ink-200 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CRM_CONFIGS.map((crm, idx) => (
            <div key={crm.type} className="animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <CRMConnectorCard
                type={crm.type}
                name={crm.name}
                description={crm.description}
                logo={crm.logo}
                color={crm.color}
                status={getStatusForType(crm.type)}
                lastSyncAt={getConnectionForType(crm.type)?.last_sync_at}
                onConnect={() => openModal(crm)}
                onManage={() => openModal(crm)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Connection Modal */}
      {selectedCRM && (
        <CRMConnectionModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedCRM(null) }}
          crmType={selectedCRM.type}
          crmName={selectedCRM.name}
          crmLogo={selectedCRM.logo}
          crmColor={selectedCRM.color}
          fields={selectedCRM.fields}
          supportedEntities={selectedCRM.supportedEntities}
          currentStatus={selectedConnection?.status || 'disconnected'}
          currentConfig={selectedConnection?.config as Record<string, { enabled: boolean; direction: 'import' | 'export' | 'bidirectional'; frequency: 'realtime' | '15min' | 'hourly' | 'manual' }> | undefined}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onTest={handleTest}
          onSyncNow={handleSyncNow}
          onUpdateConfig={handleUpdateConfig}
          syncLogs={syncLogs}
        />
      )}
    </div>
  )
}
