'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, Filter } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { SectionHelp } from '@/components/ui/help-tooltip'

interface AuditLog {
  id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_email: string
  user_name: string
}

const ACTION_LABELS: Record<string, string> = {
  'settings.update': 'Modification paramètres',
  'plan.update': 'Modification plan',
  'plan.create': 'Création plan',
  'api_key.create': 'Ajout clé API',
  'api_key.delete': 'Suppression clé API',
  'api_key.enable': 'Activation clé API',
  'api_key.disable': 'Désactivation clé API',
  'client.create': 'Création client',
  'client.update': 'Modification client',
}

const ACTION_COLORS: Record<string, string> = {
  'settings.update': 'bg-blue-100 text-blue-700',
  'plan.update': 'bg-purple-100 text-purple-700',
  'plan.create': 'bg-purple-100 text-purple-700',
  'api_key.create': 'bg-emerald-100 text-emerald-700',
  'api_key.delete': 'bg-red-100 text-red-700',
  'api_key.enable': 'bg-emerald-100 text-emerald-700',
  'api_key.disable': 'bg-amber-100 text-amber-700',
  'client.create': 'bg-brand-100 text-brand-700',
  'client.update': 'bg-brand-100 text-brand-700',
}

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionFilter, setActionFilter] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, logsRes] = await Promise.all([
        fetch('/api/admin/settings?category=security'),
        fetch('/api/admin/settings/audit-log?limit=50'),
      ])
      const settingsData = await settingsRes.json()
      const logsData = await logsRes.json()

      if (settingsData.settings) setSettings(settingsData.settings)
      if (logsData.logs) setLogs(logsData.logs)
    } catch (err) {
      console.error('Failed to fetch security data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  function getVal(key: string, fallback: unknown = ''): unknown {
    const v = settings[key]
    if (v === undefined || v === null) return fallback
    if (typeof v === 'string') {
      try { return JSON.parse(v) } catch { return v }
    }
    return v
  }

  function getNum(key: string, fallback = 0): number {
    const v = getVal(key, fallback)
    return Number(v) || fallback
  }

  function getBool(key: string, fallback = false): boolean {
    const v = getVal(key, fallback)
    return v === true || v === 'true'
  }

  function updateSetting(key: string, value: unknown) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      const data = await res.json()
      if (data.success || data.keysUpdated?.length > 0) {
        setToast({ type: 'success', message: 'Paramètres de sécurité sauvegardés' })
      } else {
        setToast({ type: 'error', message: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setSaving(false)
    }
  }

  const filteredLogs = actionFilter
    ? logs.filter(l => l.action === actionFilter)
    : logs

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

  function formatDetails(details: Record<string, unknown> | null): string {
    if (!details) return '—'
    const parts: string[] = []
    for (const [key, val] of Object.entries(details)) {
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.join(', ')}`)
      } else if (val !== null && val !== undefined) {
        parts.push(`${key}: ${val}`)
      }
    }
    return parts.join(' | ') || '—'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="h-4 bg-surface-100 rounded w-48 mb-4" />
          <div className="space-y-3">
            <div className="h-10 bg-surface-100 rounded" />
            <div className="h-10 bg-surface-100 rounded" />
          </div>
        </div>
        <div className="card animate-pulse">
          <div className="h-4 bg-surface-100 rounded w-48 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-surface-100 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHelp
        title="Sécurité"
        description="Politique de connexion et journal d'audit des actions administrateur."
        tips={[
          'Le blocage après X tentatives protège contre le brute force',
          'Le journal d\'audit conserve toutes les actions admin',
        ]}
      />

      {/* Security settings */}
      <div className="card">
        <h2 className="section-title mb-6">Politique de connexion</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Tentatives max avant blocage</label>
            <input
              type="number"
              className="input"
              min={1}
              max={20}
              value={getNum('max_login_attempts', 5)}
              onChange={e => updateSetting('max_login_attempts', parseInt(e.target.value) || 5)}
            />
            <p className="text-xs text-ink-300 mt-1">Nombre de tentatives de connexion échouées avant blocage du compte</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Durée de session</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input flex-1"
                min={1}
                max={168}
                value={getNum('session_timeout_hours', 24)}
                onChange={e => updateSetting('session_timeout_hours', parseInt(e.target.value) || 24)}
              />
              <span className="text-sm text-ink-400 whitespace-nowrap">heures</span>
            </div>
          </div>
          <div className="flex items-center pt-6">
            <Toggle
              checked={getBool('require_strong_password', true)}
              onChange={v => updateSetting('require_strong_password', v)}
              label="Mot de passe fort requis"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={handleSave} disabled={saving} className="btn-brand flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Audit log */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h2 className="section-title">Journal d&apos;audit</h2>
            <p className="text-xs text-ink-300 mt-0.5">Les 50 dernières actions administrateur</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-300" />
            <select
              className="input py-1.5 text-sm w-48"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="">Toutes les actions</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Détails</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-ink-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className="text-ink-700 font-medium">{log.user_name}</span>
                      <br />
                      <span className="text-xs text-ink-300">{log.user_email}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-surface-100 text-ink-600'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-ink-400 max-w-xs truncate">
                      {formatDetails(log.details)}
                    </td>
                    <td className="px-6 py-3 text-xs text-ink-300 font-mono">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-ink-300">
                    {actionFilter ? 'Aucune action de ce type' : 'Aucune action enregistrée'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
