'use client'

import { useState } from 'react'
import { CONNECTORS, CONNECTOR_CATEGORIES, getConnectorConfig, type ConnectorConfig } from '@/lib/connectors-config'
import type { Connector } from '@/types/database'
import { Plus, X, Wifi, WifiOff, AlertTriangle, Trash2, TestTube, ExternalLink, Search } from 'lucide-react'

interface ConnectorManagerProps {
  clientId: string
  initialConnectors: Connector[]
}

type ModalStep = 'closed' | 'select-type' | 'configure'

export function ConnectorManager({ clientId, initialConnectors }: ConnectorManagerProps) {
  const [connectors, setConnectors] = useState<Connector[]>(initialConnectors)
  const [modalStep, setModalStep] = useState<ModalStep>('closed')
  const [selectedConfig, setSelectedConfig] = useState<ConnectorConfig | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const statusConfig = {
    active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700', icon: Wifi },
    inactive: { label: 'Inactif', color: 'bg-surface-100 text-ink-400', icon: WifiOff },
    error: { label: 'Erreur', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }

  function openAddModal() {
    setModalStep('select-type')
    setSelectedConfig(null)
    setFormValues({})
    setError(null)
    setSearchQuery('')
  }

  function selectType(config: ConnectorConfig) {
    if (config.authMethod === 'oauth2' && config.type === 'gmail') {
      window.location.href = `/api/oauth/gmail/authorize?clientId=${clientId}`
      return
    }
    setSelectedConfig(config)
    setModalStep('configure')
    const initial: Record<string, string> = {}
    config.fields.forEach(f => { initial[f.key] = '' })
    setFormValues(initial)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConfig) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedConfig.type,
          credentials: formValues,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }
      const { connector } = await res.json()
      setConnectors(prev => [connector, ...prev])
      setModalStep('closed')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function testConnector(connectorId: string) {
    setTesting(connectorId)
    try {
      const res = await fetch(`/api/admin/connectors/${connectorId}/test`, { method: 'POST' })
      const data = await res.json()
      setConnectors(prev =>
        prev.map(c => c.id === connectorId ? { ...c, status: data.status } : c)
      )
    } catch {
      // silently fail
    } finally {
      setTesting(null)
    }
  }

  async function deleteConnector(connectorId: string) {
    if (!confirm('Supprimer ce connecteur ?')) return
    setDeleting(connectorId)
    try {
      const res = await fetch(`/api/admin/connectors/${connectorId}`, { method: 'DELETE' })
      if (res.ok) {
        setConnectors(prev => prev.filter(c => c.id !== connectorId))
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null)
    }
  }

  const filteredConnectors = searchQuery
    ? CONNECTORS.filter(c =>
        c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CONNECTORS

  const existingTypes = new Set(connectors.map(c => c.type))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-ink-400">{connectors.length} connecteur{connectors.length !== 1 ? 's' : ''} configuré{connectors.length !== 1 ? 's' : ''}</p>
        <button onClick={openAddModal} className="btn-brand">
          <Plus className="w-4 h-4" />
          Ajouter un connecteur
        </button>
      </div>

      {/* Connector list */}
      {connectors.length === 0 ? (
        <div className="text-center py-16 bg-surface-50 rounded-xl border-2 border-dashed border-surface-200">
          <WifiOff className="w-12 h-12 text-ink-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink-500 mb-2">Aucun connecteur</h3>
          <p className="text-ink-400 mb-4">Ajoutez des connecteurs pour activer les agents IA</p>
          <button onClick={openAddModal} className="btn-brand">
            Ajouter un connecteur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {connectors.map(connector => {
            const config = getConnectorConfig(connector.type)
            const status = statusConfig[connector.status as keyof typeof statusConfig] || statusConfig.inactive
            const StatusIcon = status.icon
            return (
              <div key={connector.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{config?.icon || '🔌'}</span>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-ink-700">{config?.label || connector.type}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-ink-400">{config?.category} · {config?.authMethod === 'oauth2' ? 'OAuth2' : config?.authMethod === 'api_key' ? 'Clé API' : 'Webhook'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnector(connector.id)}
                    disabled={testing === connector.id}
                    className="btn-secondary text-sm py-1.5"
                  >
                    <TestTube className="w-3.5 h-3.5" />
                    {testing === connector.id ? 'Test...' : 'Tester'}
                  </button>
                  <button
                    onClick={() => deleteConnector(connector.id)}
                    disabled={deleting === connector.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalStep !== 'closed' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-hover">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-100">
              <h2 className="text-lg font-bold text-ink-700">
                {modalStep === 'select-type' ? 'Choisir un connecteur' : `Configurer ${selectedConfig?.label}`}
              </h2>
              <button onClick={() => setModalStep('closed')} className="p-2 hover:bg-surface-50 rounded-lg transition">
                <X className="w-5 h-5 text-ink-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6">
              {modalStep === 'select-type' && (
                <div>
                  <div className="relative mb-6">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                    <input
                      type="text"
                      placeholder="Rechercher un connecteur..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 input"
                    />
                  </div>
                  {CONNECTOR_CATEGORIES.map(category => {
                    const items = filteredConnectors.filter(c => c.category === category)
                    if (items.length === 0) return null
                    return (
                      <div key={category} className="mb-6">
                        <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">{category}</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {items.map(config => {
                            const alreadyAdded = existingTypes.has(config.type)
                            return (
                              <button
                                key={config.type}
                                onClick={() => !alreadyAdded && selectType(config)}
                                disabled={alreadyAdded}
                                className={`flex items-center gap-3 p-3 border rounded-xl text-left transition ${
                                  alreadyAdded
                                    ? 'border-surface-100 bg-surface-50 opacity-50 cursor-not-allowed'
                                    : 'border-surface-200 hover:border-brand-300 hover:bg-brand-50 cursor-pointer'
                                }`}
                              >
                                <span className="text-xl">{config.icon}</span>
                                <div>
                                  <p className="font-medium text-ink-700 text-sm">{config.label}</p>
                                  <p className="text-xs text-ink-300">
                                    {config.authMethod === 'oauth2' ? 'OAuth2' : config.authMethod === 'api_key' ? 'Clé API' : 'Webhook'}
                                    {alreadyAdded && ' · Déjà ajouté'}
                                  </p>
                                </div>
                                {config.authMethod === 'oauth2' && !alreadyAdded && (
                                  <ExternalLink className="w-3.5 h-3.5 text-ink-300 ml-auto" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {modalStep === 'configure' && selectedConfig && (
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-surface-50 rounded-xl">
                    <span className="text-2xl">{selectedConfig.icon}</span>
                    <div>
                      <p className="font-semibold text-ink-700">{selectedConfig.label}</p>
                      <p className="text-sm text-ink-400">{selectedConfig.category}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedConfig.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-ink-600 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          required={field.required}
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="input"
                        />
                        {field.helpText && (
                          <p className="text-xs text-ink-300 mt-1">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setModalStep('select-type')}
                      className="btn-ghost"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-brand"
                    >
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
