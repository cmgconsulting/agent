'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { SectionHelp } from '@/components/ui/help-tooltip'

const TIMEZONES = [
  'Europe/Paris',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Luxembourg',
  'America/Guadeloupe',
  'Indian/Reunion',
  'Pacific/Tahiti',
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
]

const DEFAULT_PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  function updateSetting(key: string, value: unknown) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Parse JSON values that might be stringified
  function getVal(key: string, fallback: unknown = ''): unknown {
    const v = settings[key]
    if (v === undefined || v === null) return fallback
    // If value is a JSON string like '"some text"', parse it
    if (typeof v === 'string') {
      try {
        return JSON.parse(v)
      } catch {
        return v
      }
    }
    return v
  }

  function getStr(key: string, fallback = ''): string {
    const v = getVal(key, fallback)
    return String(v ?? fallback)
  }

  function getBool(key: string, fallback = false): boolean {
    const v = getVal(key, fallback)
    return v === true || v === 'true'
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
        setToast({ type: 'success', message: 'Paramètres sauvegardés avec succès' })
      } else {
        setToast({ type: 'error', message: data.error || 'Erreur lors de la sauvegarde' })
      }
    } catch {
      setToast({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-surface-100 rounded w-40 mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-surface-100 rounded" />
              <div className="h-10 bg-surface-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHelp
        title="Paramètres généraux"
        description="Configurez l'identité, les préférences clients et les emails de la plateforme."
        tips={[
          'Les modifications sont appliquées immédiatement après sauvegarde',
          'Le mode maintenance bloque l\'accès aux clients',
        ]}
      />

      {/* Section: Identité */}
      <div className="card">
        <h2 className="section-title mb-6">Identité de la plateforme</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Nom de la plateforme</label>
            <input
              type="text"
              className="input"
              value={getStr('platform_name', 'CMG Agent')}
              onChange={e => updateSetting('platform_name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Couleur principale</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={getStr('primary_color', '#FEC000')}
                onChange={e => updateSetting('primary_color', e.target.value)}
                className="w-12 h-10 rounded-xl border border-surface-200 cursor-pointer"
              />
              <input
                type="text"
                className="input flex-1"
                value={getStr('primary_color', '#FEC000')}
                onChange={e => updateSetting('primary_color', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Fuseau horaire</label>
            <select
              className="input"
              value={getStr('timezone', 'Europe/Paris')}
              onChange={e => updateSetting('timezone', e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Langue</label>
            <select
              className="input"
              value={getStr('language', 'fr')}
              onChange={e => updateSetting('language', e.target.value)}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-ink-600 mb-2">Email administrateur</label>
            <input
              type="email"
              className="input"
              value={getStr('admin_email')}
              onChange={e => updateSetting('admin_email', e.target.value)}
              placeholder="admin@cmgconsulting.fr"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-ink-600 mb-2">URL du logo</label>
            <input
              type="text"
              className="input"
              value={getStr('platform_logo_url')}
              onChange={e => updateSetting('platform_logo_url', e.target.value)}
              placeholder="https://..."
            />
            {getStr('platform_logo_url') && (
              <div className="mt-3 p-3 bg-surface-50 rounded-xl inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getStr('platform_logo_url')} alt="Logo" className="h-10 object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section: Clients */}
      <div className="card">
        <h2 className="section-title mb-6">Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Plan par défaut</label>
            <select
              className="input"
              value={getStr('default_plan', 'starter')}
              onChange={e => updateSetting('default_plan', e.target.value)}
            >
              {DEFAULT_PLANS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="text-xs text-ink-300 mt-1">Plan assigné aux nouveaux clients par défaut</p>
          </div>
          <div className="flex items-center">
            <div>
              <Toggle
                checked={getBool('maintenance_mode')}
                onChange={v => updateSetting('maintenance_mode', v)}
                label="Mode maintenance"
              />
              <p className="text-xs text-ink-300 mt-1 ml-14">Bloque l&apos;accès aux clients pendant la maintenance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Emails */}
      <div className="card">
        <h2 className="section-title mb-6">Emails</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Nom expéditeur</label>
            <input
              type="text"
              className="input"
              value={getStr('smtp_from_name', 'CMG Agent')}
              onChange={e => updateSetting('smtp_from_name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-600 mb-2">Email expéditeur</label>
            <input
              type="email"
              className="input"
              value={getStr('smtp_from_email')}
              onChange={e => updateSetting('smtp_from_email', e.target.value)}
              placeholder="noreply@cmgconsulting.fr"
            />
          </div>
          <div className="md:col-span-2">
            <Toggle
              checked={getBool('welcome_email_enabled', true)}
              onChange={v => updateSetting('welcome_email_enabled', v)}
              label="Envoyer un email de bienvenue aux nouveaux clients"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-brand flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
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
