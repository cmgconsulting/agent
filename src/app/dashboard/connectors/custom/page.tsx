'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, TestTube, Wifi, WifiOff, AlertTriangle,
  Plug, X, Save, Loader2, Search, ArrowLeft, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CustomConnectorType, AuthMethod, McpDiscoveredTool } from '@/types/database'

// ============================================
// Types
// ============================================

interface ConnectorData {
  id: string
  name: string
  description: string | null
  connector_type: CustomConnectorType
  base_url: string | null
  http_method: string
  auth_method: AuthMethod
  credentials_masked: Record<string, string> | null
  custom_headers: Record<string, string>
  mcp_config: { server_url: string; transport: string; discovered_tools?: McpDiscoveredTool[] } | null
  status: 'active' | 'inactive' | 'error'
  last_error: string | null
  last_tested_at: string | null
}

interface FormState {
  name: string
  description: string
  connector_type: CustomConnectorType
  base_url: string
  http_method: string
  auth_method: AuthMethod
  credentials: Record<string, string>
  custom_headers: Array<{ key: string; value: string }>
  mcp_server_url: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  connector_type: 'api_rest',
  base_url: '',
  http_method: 'GET',
  auth_method: 'none',
  credentials: {},
  custom_headers: [],
  mcp_server_url: '',
}

const authMethodLabels: Record<AuthMethod, string> = {
  none: 'Aucune',
  api_key: 'Clé API',
  bearer_token: 'Bearer Token',
  basic_auth: 'Authentification basique',
  oauth2: 'OAuth2',
}

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const statusConfig = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700', Icon: Wifi },
  inactive: { label: 'Inactif', color: 'bg-surface-100 text-ink-400', Icon: WifiOff },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', Icon: AlertTriangle },
}

const labelCls = 'block text-sm font-medium text-ink-600 mb-1'

// ============================================
// Component
// ============================================

export default function CustomConnectorsPage() {
  const router = useRouter()
  const [connectors, setConnectors] = useState<ConnectorData[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [discovering, setDiscovering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadConnectors = useCallback(async () => {
    // Admin-only page: redirect non-admin users
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') { router.push('/dashboard/connectors'); return }
    setAuthorized(true)

    try {
      const res = await fetch('/api/connectors/custom')
      const data = await res.json()
      if (res.ok) setConnectors(data.connectors || [])
    } catch {
      setError('Impossible de charger les connecteurs')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadConnectors() }, [loadConnectors])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  function openEdit(c: ConnectorData) {
    setForm({
      name: c.name,
      description: c.description || '',
      connector_type: c.connector_type,
      base_url: c.base_url || '',
      http_method: c.http_method,
      auth_method: c.auth_method,
      credentials: {},
      custom_headers: Object.entries(c.custom_headers || {}).map(([key, value]) => ({ key, value })),
      mcp_server_url: c.mcp_config?.server_url || '',
    })
    setEditingId(c.id)
    setShowForm(true)
    setError(null)
    setSuccess(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  async function saveConnector() {
    if (!form.name.trim()) { setError('Le nom est requis'); return }

    setSaving(true)
    setError(null)

    const headersObj: Record<string, string> = {}
    form.custom_headers.forEach(h => { if (h.key.trim()) headersObj[h.key.trim()] = h.value })

    const body: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      connector_type: form.connector_type,
      http_method: form.http_method,
      auth_method: form.auth_method,
      custom_headers: headersObj,
    }

    if (form.connector_type === 'api_rest') {
      body.base_url = form.base_url || null
    } else {
      body.mcp_config = { server_url: form.mcp_server_url, transport: 'sse' }
    }

    if (Object.keys(form.credentials).length > 0) {
      body.credentials = form.credentials
    }

    try {
      const url = editingId ? `/api/connectors/custom/${editingId}` : '/api/connectors/custom'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()

      if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return }

      setSuccess(editingId ? 'Connecteur mis à jour' : 'Connecteur créé')
      setShowForm(false)
      setEditingId(null)
      await loadConnectors()
    } catch {
      setError('Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function deleteConnector(id: string) {
    if (!confirm('Supprimer ce connecteur ?')) return
    try {
      await fetch(`/api/connectors/custom/${id}`, { method: 'DELETE' })
      await loadConnectors()
      setSuccess('Connecteur supprimé')
    } catch {
      setError('Erreur de suppression')
    }
  }

  async function testConnector(id: string) {
    setTesting(id)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/connectors/custom/${id}/test`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSuccess(data.message)
      } else {
        setError(data.message || data.error)
      }
      await loadConnectors()
    } catch {
      setError('Erreur lors du test')
    } finally {
      setTesting(null)
    }
  }

  async function discoverTools(id: string) {
    setDiscovering(id)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/connectors/custom/${id}/discover`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message)
        await loadConnectors()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Erreur lors de la découverte')
    } finally {
      setDiscovering(null)
    }
  }

  function renderCredentialFields() {
    switch (form.auth_method) {
      case 'api_key':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Clé API</label>
              <input type="password" className="input" placeholder="Votre clé API"
                value={form.credentials.api_key || ''}
                onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, api_key: e.target.value } }))} />
            </div>
            <div>
              <label className={labelCls}>Nom du header (optionnel)</label>
              <input className="input" placeholder="X-API-Key"
                value={form.credentials.header_name || ''}
                onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, header_name: e.target.value } }))} />
            </div>
          </div>
        )
      case 'bearer_token':
        return (
          <div>
            <label className={labelCls}>Token</label>
            <input type="password" className="input" placeholder="Votre token"
              value={form.credentials.token || ''}
              onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, token: e.target.value } }))} />
          </div>
        )
      case 'basic_auth':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Utilisateur</label>
              <input className="input" placeholder="username"
                value={form.credentials.username || ''}
                onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, username: e.target.value } }))} />
            </div>
            <div>
              <label className={labelCls}>Mot de passe</label>
              <input type="password" className="input" placeholder="password"
                value={form.credentials.password || ''}
                onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, password: e.target.value } }))} />
            </div>
          </div>
        )
      case 'oauth2':
        return (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Access Token</label>
              <input type="password" className="input"
                value={form.credentials.access_token || ''}
                onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, access_token: e.target.value } }))} />
            </div>
            <div>
              <label className={labelCls}>Refresh Token (optionnel)</label>
              <input type="password" className="input"
                value={form.credentials.refresh_token || ''}
                onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, refresh_token: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Token URL</label>
                <input className="input" placeholder="https://..."
                  value={form.credentials.token_url || ''}
                  onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, token_url: e.target.value } }))} />
              </div>
              <div>
                <label className={labelCls}>Client ID</label>
                <input className="input"
                  value={form.credentials.client_id || ''}
                  onChange={e => setForm(f => ({ ...f, credentials: { ...f.credentials, client_id: e.target.value } }))} />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading || !authorized) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/connectors" className="text-ink-300 hover:text-ink-500 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-ink-700">Connecteurs personnalisés</h1>
          </div>
          <p className="text-ink-400 ml-8">API REST et MCP</p>
        </div>
        <button onClick={openCreate} className="btn-brand">
          <Plus className="w-4 h-4" /> Nouveau connecteur
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2"><Wifi className="w-4 h-4 flex-shrink-0" />{success}</div>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-ink-700">
              {editingId ? 'Modifier le connecteur' : 'Nouveau connecteur'}
            </h2>
            <button onClick={closeForm} className="text-ink-300 hover:text-ink-500"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-4">
            {/* Name + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nom *</label>
                <input className="input" placeholder="Mon API" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className="input" placeholder="Description optionnelle" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            {/* Type selector */}
            <div>
              <label className={labelCls}>Type de connecteur</label>
              <div className="flex gap-2">
                {(['api_rest', 'mcp'] as CustomConnectorType[]).map(type => (
                  <button key={type}
                    onClick={() => setForm(f => ({ ...f, connector_type: type }))}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition ${
                      form.connector_type === type
                        ? 'bg-brand-50 border-brand-300 text-brand-600'
                        : 'bg-white border-surface-200 text-ink-500 hover:bg-surface-50'
                    }`}>
                    {type === 'api_rest' ? 'API REST' : 'MCP (Model Context Protocol)'}
                  </button>
                ))}
              </div>
            </div>

            {/* API REST config */}
            {form.connector_type === 'api_rest' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>URL de base</label>
                    <input className="input" placeholder="https://api.example.com/v1/data" value={form.base_url}
                      onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Méthode HTTP</label>
                    <div className="relative">
                      <select className="input appearance-none pr-8" value={form.http_method}
                        onChange={e => setForm(f => ({ ...f, http_method: e.target.value }))}>
                        {httpMethods.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Auth method */}
                <div>
                  <label className={labelCls}>Authentification</label>
                  <div className="relative">
                    <select className="input appearance-none pr-8" value={form.auth_method}
                      onChange={e => setForm(f => ({ ...f, auth_method: e.target.value as AuthMethod, credentials: {} }))}>
                      {(Object.keys(authMethodLabels) as AuthMethod[]).map(m => (
                        <option key={m} value={m}>{authMethodLabels[m]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 pointer-events-none" />
                  </div>
                </div>

                {renderCredentialFields()}

                {/* Custom headers */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls}>Headers personnalisés</label>
                    <button onClick={() => setForm(f => ({ ...f, custom_headers: [...f.custom_headers, { key: '', value: '' }] }))}
                      className="flex items-center gap-1 text-brand-500 text-sm hover:text-brand-600">
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>
                  {form.custom_headers.map((h, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input className="input" placeholder="Header-Name" value={h.key}
                        onChange={e => {
                          const updated = [...form.custom_headers]
                          updated[i] = { ...updated[i], key: e.target.value }
                          setForm(f => ({ ...f, custom_headers: updated }))
                        }} />
                      <input className="input" placeholder="Valeur" value={h.value}
                        onChange={e => {
                          const updated = [...form.custom_headers]
                          updated[i] = { ...updated[i], value: e.target.value }
                          setForm(f => ({ ...f, custom_headers: updated }))
                        }} />
                      <button onClick={() => setForm(f => ({ ...f, custom_headers: f.custom_headers.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* MCP config */}
            {form.connector_type === 'mcp' && (
              <div>
                <label className={labelCls}>URL du serveur MCP</label>
                <input className="input" placeholder="https://mcp.example.com/sse" value={form.mcp_server_url}
                  onChange={e => setForm(f => ({ ...f, mcp_server_url: e.target.value }))} />
                <p className="text-xs text-ink-300 mt-1">Le serveur doit supporter le transport Streamable HTTP (JSON-RPC 2.0)</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeForm} className="btn-ghost">
                Annuler
              </button>
              <button onClick={saveConnector} disabled={saving} className="btn-brand">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connectors list */}
      {connectors.length > 0 ? (
        <div className="grid gap-4">
          {connectors.map(connector => {
            const status = statusConfig[connector.status]
            const StatusIcon = status.Icon
            const isTesting = testing === connector.id
            const isDiscovering = discovering === connector.id

            return (
              <div key={connector.id}
                className="card-interactive">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => openEdit(connector)}>
                    <span className="text-2xl">{connector.connector_type === 'mcp' ? '🤖' : '🔌'}</span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-ink-700">{connector.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-600">
                          {connector.connector_type === 'mcp' ? 'MCP' : 'API REST'}
                        </span>
                      </div>
                      {connector.description && (
                        <p className="text-sm text-ink-400 mt-0.5">{connector.description}</p>
                      )}
                      {connector.connector_type === 'mcp' && connector.mcp_config?.discovered_tools && (
                        <p className="text-xs text-ink-300 mt-1">
                          {connector.mcp_config.discovered_tools.length} tool(s) disponible(s)
                        </p>
                      )}
                      {connector.last_error && connector.status === 'error' && (
                        <p className="text-xs text-red-500 mt-1">{connector.last_error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {connector.connector_type === 'mcp' && (
                      <button onClick={() => discoverTools(connector.id)} disabled={isDiscovering}
                        className="btn-secondary text-sm py-1.5"
                        title="Découvrir les tools MCP">
                        {isDiscovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Tools
                      </button>
                    )}
                    <button onClick={() => testConnector(connector.id)} disabled={isTesting}
                      className="btn-secondary text-sm py-1.5"
                      title="Tester la connexion">
                      {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      Tester
                    </button>
                    <button onClick={() => deleteConnector(connector.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface-50 rounded-xl border-2 border-dashed border-surface-200">
          <Plug className="w-12 h-12 text-ink-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink-500 mb-2">Aucun connecteur personnalisé</h3>
          <p className="text-ink-400 mb-4">Connectez vos propres API ou serveurs MCP</p>
          <button onClick={openCreate} className="btn-brand">
            <Plus className="w-4 h-4" /> Créer un connecteur
          </button>
        </div>
      )}
    </div>
  )
}
