'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Key, Loader2, Trash2, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'

interface ApiKey {
  id: string
  name: string
  provider: string
  is_active: boolean
  last_used_at: string | null
  usage_count: number
  key_preview: string
  created_at: string
}

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', color: 'bg-orange-100 text-orange-700' },
  { value: 'openai', label: 'OpenAI', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'brevo', label: 'Brevo', color: 'bg-blue-100 text-blue-700' },
  { value: 'stripe', label: 'Stripe', color: 'bg-purple-100 text-purple-700' },
  { value: 'meta', label: 'Meta', color: 'bg-sky-100 text-sky-700' },
  { value: 'google', label: 'Google', color: 'bg-red-100 text-red-700' },
  { value: 'twilio', label: 'Twilio', color: 'bg-pink-100 text-pink-700' },
  { value: 'custom', label: 'Autre', color: 'bg-surface-100 text-ink-600' },
]

function getProviderConfig(provider: string) {
  return PROVIDERS.find(p => p.value === provider) || PROVIDERS[PROVIDERS.length - 1]
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Jamais utilisée'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newKey, setNewKey] = useState({ name: '', provider: 'anthropic', key: '' })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/api-keys')
      const data = await res.json()
      if (data.keys) setKeys(data.keys)
    } catch (err) {
      console.error('Failed to fetch API keys:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  async function handleCreate() {
    if (!newKey.name || !newKey.key) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      })
      const data = await res.json()
      if (data.key) {
        setShowModal(false)
        setNewKey({ name: '', provider: 'anthropic', key: '' })
        fetchKeys()
        setToast({ type: 'success', message: `Clé "${data.key.name}" ajoutée` })
      } else {
        setToast({ type: 'error', message: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(key: ApiKey) {
    try {
      const res = await fetch(`/api/admin/settings/api-keys/${key.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !key.is_active }),
      })
      const data = await res.json()
      if (data.key) {
        setKeys(prev => prev.map(k => k.id === key.id ? { ...k, is_active: data.key.is_active } : k))
      }
    } catch {
      setToast({ type: 'error', message: 'Erreur' })
    }
  }

  async function handleDelete(key: ApiKey) {
    if (!confirm(`Supprimer la clé "${key.name}" ?`)) return
    try {
      await fetch(`/api/admin/settings/api-keys/${key.id}`, { method: 'DELETE' })
      setKeys(prev => prev.filter(k => k.id !== key.id))
      setToast({ type: 'success', message: `Clé "${key.name}" supprimée` })
    } catch {
      setToast({ type: 'error', message: 'Erreur' })
    }
  }

  function handleCopy(key: ApiKey) {
    navigator.clipboard.writeText(key.key_preview)
    setCopiedId(key.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-100 rounded w-40" />
                <div className="h-3 bg-surface-100 rounded w-60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <SectionHelp
          title="Clés API"
          description="Gérez les clés API pour les services externes (IA, email, paiement, etc.)."
          tips={[
            'Les clés sont chiffrées en base de données (AES-256-GCM)',
            'Seuls les premiers et derniers caractères sont visibles',
            'Désactivez une clé avant de la supprimer pour tester l\'impact',
          ]}
        />
        <button onClick={() => setShowModal(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Ajouter une clé
        </button>
      </div>

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="card text-center py-12">
          <Key className="w-12 h-12 mx-auto mb-3 text-surface-200" />
          <p className="text-ink-400 font-medium">Aucune clé API configurée</p>
          <p className="text-ink-300 text-sm mt-1">Ajoutez vos clés pour connecter les services externes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => {
            const provider = getProviderConfig(key.provider)
            return (
              <div
                key={key.id}
                className={`card flex items-center gap-4 ${!key.is_active ? 'opacity-60' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${provider.color}`}>
                  <Key className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-700 text-sm">{key.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${provider.color}`}>
                      {provider.label}
                    </span>
                    {!key.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-ink-300">
                    <span className="font-mono">{key.key_preview}</span>
                    <span>•</span>
                    <span>{timeAgo(key.last_used_at)}</span>
                    <span>•</span>
                    <span>{key.usage_count.toLocaleString()} utilisations</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(key)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-ink-300 hover:text-ink-600 transition-colors"
                    title="Copier l'aperçu"
                  >
                    {copiedId === key.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleToggle(key)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-ink-300 hover:text-ink-600 transition-colors"
                    title={key.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {key.is_active ? <ToggleRight className="w-5 h-5 text-brand-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(key)}
                    className="p-2 rounded-lg hover:bg-red-50 text-ink-300 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md m-4 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink-700">Ajouter une clé API</h2>
              <button onClick={() => setShowModal(false)} className="text-ink-300 hover:text-ink-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-600 mb-2">Nom</label>
                <input
                  type="text"
                  className="input"
                  value={newKey.name}
                  onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                  placeholder="Ex: Anthropic Production"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-600 mb-2">Fournisseur</label>
                <select
                  className="input"
                  value={newKey.provider}
                  onChange={e => setNewKey({ ...newKey, provider: e.target.value })}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-600 mb-2">Clé API</label>
                <input
                  type="password"
                  className="input font-mono"
                  value={newKey.key}
                  onChange={e => setNewKey({ ...newKey, key: e.target.value })}
                  placeholder="sk-..."
                />
                <p className="text-xs text-ink-300 mt-1">La clé sera chiffrée avant stockage (AES-256-GCM)</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newKey.name || !newKey.key}
                className="btn-brand flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Création...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

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
