'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ClientBranding } from '@/types/database'
import { ArrowLeft, Save, Loader2, Check, Palette, RotateCcw } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_BRANDING: ClientBranding = {
  logo_url: null,
  primary_color: '#2563EB',   // blue-600
  secondary_color: '#1E40AF', // blue-800
  accent_color: '#10B981',    // emerald-500
}

export default function BrandingPage() {
  const params = useParams()
  const supabase = createClient()
  const clientId = params.id as string

  const [clientName, setClientName] = useState('')
  const [branding, setBranding] = useState<ClientBranding>(DEFAULT_BRANDING)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: client } = await supabase
        .from('clients')
        .select('company_name, branding')
        .eq('id', clientId)
        .single()

      if (client) {
        setClientName(client.company_name)
        if (client.branding) {
          setBranding({ ...DEFAULT_BRANDING, ...(client.branding as ClientBranding) })
        }
      }
    }
    load()
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    await supabase
      .from('clients')
      .update({ branding })
      .eq('id', clientId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function resetDefaults() {
    setBranding(DEFAULT_BRANDING)
  }

  return (
    <div>
      <Link href={`/admin/clients/${clientId}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour au client
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personnalisation</h1>
          <p className="text-gray-500">{clientName} — White-label</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            <RotateCcw className="w-4 h-4" /> Reinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Sauvegarde !' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Logo
            </h3>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">URL du logo</label>
              <input
                type="url"
                value={branding.logo_url || ''}
                onChange={e => setBranding(prev => ({ ...prev, logo_url: e.target.value || null }))}
                placeholder="https://example.com/logo.png"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400">Format recommande : PNG ou SVG, 200x60px min</p>
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Couleurs</h3>
            <div className="space-y-4">
              {[
                { key: 'primary_color' as const, label: 'Couleur principale', desc: 'Boutons, liens, elements actifs' },
                { key: 'secondary_color' as const, label: 'Couleur secondaire', desc: 'Arriere-plans, bordures' },
                { key: 'accent_color' as const, label: 'Couleur accent', desc: 'Succes, badges, highlights' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-4">
                  <input
                    type="color"
                    value={branding[key]}
                    onChange={e => setBranding(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <input
                    type="text"
                    value={branding[key]}
                    onChange={e => setBranding(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-center"
                    maxLength={7}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Apercu</h3>

          {/* Mock dashboard preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: branding.primary_color }}>
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo_url} alt="Logo" className="h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                  {clientName?.charAt(0) || 'C'}
                </div>
              )}
              <span className="text-white font-semibold text-sm">{clientName || 'Mon Entreprise'}</span>
            </div>

            {/* Mock sidebar + content */}
            <div className="flex min-h-[300px]">
              <div className="w-36 border-r border-gray-100 p-3 space-y-1">
                {['Dashboard', 'Agents', 'SAV', 'Emails'].map((item, i) => (
                  <div
                    key={item}
                    className="px-3 py-2 rounded text-xs font-medium"
                    style={i === 0 ? { backgroundColor: `${branding.primary_color}15`, color: branding.primary_color } : { color: '#6B7280' }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Bienvenue, {clientName || 'Client'}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: `${branding.primary_color}10` }}>
                    <p className="font-bold" style={{ color: branding.primary_color }}>5</p>
                    <p className="text-gray-500">Agents actifs</p>
                  </div>
                  <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: `${branding.accent_color}10` }}>
                    <p className="font-bold" style={{ color: branding.accent_color }}>12</p>
                    <p className="text-gray-500">Actions OK</p>
                  </div>
                </div>
                <button
                  className="px-4 py-2 text-white text-xs font-medium rounded-lg"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Lancer un agent
                </button>
                <button
                  className="px-4 py-2 text-xs font-medium rounded-lg ml-2"
                  style={{ backgroundColor: `${branding.secondary_color}15`, color: branding.secondary_color }}
                >
                  Voir les logs
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Apercu du dashboard client avec les couleurs personnalisees
          </p>
        </div>
      </div>
    </div>
  )
}
