'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, CheckCircle, AlertCircle, Loader2, RefreshCw, ArrowRight,
  ToggleLeft, ToggleRight, Clock, AlertTriangle
} from 'lucide-react'

interface CRMField {
  key: string
  label: string
  placeholder: string
  type?: string
}

interface SyncConfig {
  enabled: boolean
  direction: 'import' | 'export' | 'bidirectional'
  frequency: 'realtime' | '15min' | 'hourly' | 'manual'
}

interface SyncLogEntry {
  id: string
  sync_type: string
  direction: string
  status: string
  items_synced: number
  items_failed: number
  created_at: string
  completed_at: string | null
}

interface CRMConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  crmType: string
  crmName: string
  crmLogo: string
  crmColor: string
  fields: CRMField[]
  supportedEntities: string[]
  currentStatus: 'connected' | 'disconnected' | 'error' | 'syncing'
  currentConfig?: Record<string, SyncConfig>
  onConnect: (credentials: Record<string, string>) => Promise<{ success: boolean; error?: string }>
  onDisconnect: () => Promise<void>
  onTest: () => Promise<{ success: boolean; error?: string }>
  onSyncNow: () => Promise<void>
  onUpdateConfig: (config: Record<string, SyncConfig>) => Promise<void>
  syncLogs?: SyncLogEntry[]
}

const entityLabels: Record<string, string> = {
  contacts: 'Contacts',
  devis: 'Devis',
  factures: 'Factures',
  chantiers: 'Chantiers',
  leads: 'Leads',
}

const directionLabels: Record<string, string> = {
  import: 'CRM → App',
  export: 'App → CRM',
  bidirectional: 'Bidirectionnel',
}

const frequencyLabels: Record<string, string> = {
  realtime: 'Temps reel (webhook)',
  '15min': 'Toutes les 15 min',
  hourly: 'Toutes les heures',
  manual: 'Manuel',
}

const syncStatusIcons: Record<string, { icon: typeof CheckCircle; className: string }> = {
  success: { icon: CheckCircle, className: 'text-emerald-500' },
  partial: { icon: AlertTriangle, className: 'text-amber-500' },
  error: { icon: AlertCircle, className: 'text-red-500' },
  started: { icon: Loader2, className: 'text-blue-500 animate-spin' },
}

export function CRMConnectionModal({
  isOpen,
  onClose,
  crmName,
  crmLogo,
  crmColor,
  fields,
  supportedEntities,
  currentStatus,
  currentConfig,
  onConnect,
  onDisconnect,
  onTest,
  onSyncNow,
  onUpdateConfig,
  syncLogs = [],
}: CRMConnectionModalProps) {
  const [step, setStep] = useState<'credentials' | 'config' | 'logs'>(
    currentStatus === 'connected' ? 'config' : 'credentials'
  )
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [syncConfig, setSyncConfig] = useState<Record<string, SyncConfig>>(
    currentConfig || supportedEntities.reduce((acc, entity) => {
      acc[entity] = { enabled: true, direction: 'bidirectional', frequency: 'manual' }
      return acc
    }, {} as Record<string, SyncConfig>)
  )

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep(currentStatus === 'connected' ? 'config' : 'credentials')
      setTestResult(null)
      setFormValues({})
    }
  }, [isOpen, currentStatus])

  const handleConnect = useCallback(async () => {
    setIsLoading(true)
    setTestResult(null)
    try {
      const result = await onConnect(formValues)
      setTestResult(result)
      if (result.success) {
        setTimeout(() => setStep('config'), 1500)
      }
    } finally {
      setIsLoading(false)
    }
  }, [formValues, onConnect])

  const handleTest = useCallback(async () => {
    setIsLoading(true)
    setTestResult(null)
    try {
      const result = await onTest()
      setTestResult(result)
    } finally {
      setIsLoading(false)
    }
  }, [onTest])

  const handleDisconnect = useCallback(async () => {
    if (!confirm('Deconnecter ce CRM ? Les donnees synchronisees ne seront pas supprimees.')) return
    setIsLoading(true)
    try {
      await onDisconnect()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }, [onDisconnect, onClose])

  const handleSaveConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      await onUpdateConfig(syncConfig)
    } finally {
      setIsLoading(false)
    }
  }, [syncConfig, onUpdateConfig])

  const handleSyncNow = useCallback(async () => {
    setIsLoading(true)
    try {
      await onSyncNow()
    } finally {
      setIsLoading(false)
    }
  }, [onSyncNow])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-hover w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: `${crmColor}15` }}
              >
                {crmLogo}
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink-700">{crmName}</h2>
                <p className="text-xs text-ink-300">
                  {currentStatus === 'connected' ? 'Connecte' : 'Configuration'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-ink-300 hover:text-ink-500 hover:bg-surface-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs (when connected) */}
          {currentStatus === 'connected' && (
            <div className="flex border-b border-surface-100">
              {(['config', 'logs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStep(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    step === tab
                      ? 'text-brand-600 border-b-2 border-brand-400'
                      : 'text-ink-300 hover:text-ink-500'
                  }`}
                >
                  {tab === 'config' ? 'Configuration' : 'Journal de sync'}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Step: Credentials */}
            {step === 'credentials' && (
              <div className="space-y-5">
                <p className="text-sm text-ink-400">
                  Entrez vos identifiants pour connecter {crmName} a vos agents IA.
                  Vos donnees sont chiffrees et securisees.
                </p>

                {fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-ink-600 mb-1.5">{field.label}</label>
                    <input
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={formValues[field.key] || ''}
                      onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="input w-full"
                    />
                  </div>
                ))}

                {/* Test result */}
                {testResult && (
                  <div className={`flex items-center gap-3 p-4 rounded-xl ${
                    testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium">
                      {testResult.success ? 'Connexion reussie !' : testResult.error || 'Erreur de connexion'}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isLoading || fields.some(f => !formValues[f.key])}
                  className="w-full btn-brand py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Tester et connecter
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step: Config */}
            {step === 'config' && (
              <div className="space-y-6">
                {/* Sync toggles */}
                <div>
                  <h3 className="text-sm font-semibold text-ink-600 mb-3">Donnees a synchroniser</h3>
                  <div className="space-y-3">
                    {supportedEntities.map(entity => {
                      const config = syncConfig[entity] || { enabled: false, direction: 'bidirectional' as const, frequency: 'manual' as const }
                      return (
                        <div key={entity} className="bg-surface-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-ink-600">{entityLabels[entity] || entity}</span>
                            <button
                              onClick={() => setSyncConfig(prev => ({
                                ...prev,
                                [entity]: { ...config, enabled: !config.enabled },
                              }))}
                              className="text-ink-400"
                            >
                              {config.enabled ? (
                                <ToggleRight className="w-8 h-5 text-brand-500" />
                              ) : (
                                <ToggleLeft className="w-8 h-5 text-ink-200" />
                              )}
                            </button>
                          </div>
                          {config.enabled && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-ink-300 mb-1 block">Direction</label>
                                <select
                                  value={config.direction}
                                  onChange={e => setSyncConfig(prev => ({
                                    ...prev,
                                    [entity]: { ...config, direction: e.target.value as SyncConfig['direction'] },
                                  }))}
                                  className="input text-sm w-full py-1.5"
                                >
                                  {Object.entries(directionLabels).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-ink-300 mb-1 block">Frequence</label>
                                <select
                                  value={config.frequency}
                                  onChange={e => setSyncConfig(prev => ({
                                    ...prev,
                                    [entity]: { ...config, frequency: e.target.value as SyncConfig['frequency'] },
                                  }))}
                                  className="input text-sm w-full py-1.5"
                                >
                                  {Object.entries(frequencyLabels).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button onClick={handleSaveConfig} disabled={isLoading} className="btn-brand text-sm flex items-center gap-2 flex-1">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
                  </button>
                  <button onClick={handleSyncNow} disabled={isLoading} className="btn-secondary text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Synchroniser
                  </button>
                  <button onClick={handleTest} disabled={isLoading} className="btn-secondary text-sm flex items-center gap-2">
                    Tester
                  </button>
                </div>

                {/* Test result */}
                {testResult && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                    testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {testResult.success ? 'Connexion fonctionnelle' : testResult.error || 'Erreur'}
                  </div>
                )}

                {/* Disconnect */}
                <div className="pt-4 border-t border-surface-100">
                  <button
                    onClick={handleDisconnect}
                    className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    Deconnecter {crmName}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Logs */}
            {step === 'logs' && (
              <div>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-ink-200 mx-auto mb-3" />
                    <p className="text-sm text-ink-300">Aucune synchronisation effectuee</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncLogs.map(log => {
                      const statusInfo = syncStatusIcons[log.status] || syncStatusIcons.error
                      const Icon = statusInfo.icon
                      return (
                        <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${statusInfo.className}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-600">
                              {entityLabels[log.sync_type] || log.sync_type} — {directionLabels[log.direction] || log.direction}
                            </p>
                            <p className="text-xs text-ink-300">
                              {log.items_synced} element{log.items_synced !== 1 ? 's' : ''} synchronise{log.items_synced !== 1 ? 's' : ''}
                              {log.items_failed > 0 && ` · ${log.items_failed} erreur${log.items_failed !== 1 ? 's' : ''}`}
                            </p>
                          </div>
                          <p className="text-xs text-ink-200 flex-shrink-0">
                            {new Date(log.created_at).toLocaleString('fr-FR', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
