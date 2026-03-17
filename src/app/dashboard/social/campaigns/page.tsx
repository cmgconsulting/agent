'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Loader2,
  Trash2,
  Play,
  Pause,
  Target,
  DollarSign,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

interface Campaign {
  id: string
  name: string
  description: string | null
  platforms: string[]
  objective: string | null
  status: string
  budget_total: number | null
  budget_spent: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-surface-100 text-ink-500' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'En pause', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Terminée', color: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archivée', color: 'bg-surface-100 text-ink-300' },
}

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: 'Notoriété',
  traffic: 'Trafic',
  engagement: 'Engagement',
  leads: 'Leads',
  sales: 'Ventes',
}

export default function SocialCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objective: 'awareness',
    platforms: [] as string[],
    budget_total: '',
    start_date: '',
    end_date: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/social/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createCampaign = async () => {
    if (!formData.name) return
    setSaving(true)
    try {
      const res = await fetch('/api/social/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget_total: formData.budget_total ? parseFloat(formData.budget_total) : null,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormData({ name: '', description: '', objective: 'awareness', platforms: [], budget_total: '', start_date: '', end_date: '' })
        load()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const launchCampaign = async (id: string) => {
    const res = await fetch(`/api/social/campaigns/${id}/launch`, { method: 'POST' })
    if (res.ok) load()
  }

  const pauseCampaign = async (id: string) => {
    await fetch(`/api/social/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' }),
    })
    load()
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    await fetch(`/api/social/campaigns/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Target className="w-5 h-5 text-brand-500" />}
        title="Campagnes"
        subtitle="Gérez vos campagnes publicitaires"
        action={{ label: 'Nouvelle campagne', onClick: () => setShowForm(true), icon: <Plus className="w-4 h-4" /> }}
      />

      {/* Create form modal */}
      {showForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Nouvelle campagne</h2>
            <button onClick={() => setShowForm(false)} className="text-ink-300 hover:text-ink-500 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                className="input"
                placeholder="Nom de la campagne"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Objectif</label>
              <select
                value={formData.objective}
                onChange={e => setFormData(d => ({ ...d, objective: e.target.value }))}
                className="input"
              >
                {Object.entries(OBJECTIVE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink-600 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                className="input"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Budget total (EUR)</label>
              <input
                type="number"
                value={formData.budget_total}
                onChange={e => setFormData(d => ({ ...d, budget_total: e.target.value }))}
                className="input"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink-600 mb-1">Début</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData(d => ({ ...d, start_date: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink-600 mb-1">Fin</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData(d => ({ ...d, end_date: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary">
              Annuler
            </button>
            <button
              onClick={createCampaign}
              disabled={saving || !formData.name}
              className="btn-brand"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="card text-center py-12 text-ink-400">
          <Target className="h-12 w-12 mx-auto mb-3 text-surface-200" />
          <p>Aucune campagne</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const statusCfg = STATUS_LABELS[campaign.status] || STATUS_LABELS.draft
            return (
              <div key={campaign.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-ink-700">{campaign.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {campaign.objective && (
                        <span className="text-xs text-ink-400">
                          {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
                        </span>
                      )}
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-ink-400 mt-1">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-ink-300">
                      {campaign.budget_total && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {campaign.budget_spent?.toFixed(2) || '0.00'} / {campaign.budget_total.toFixed(2)} {campaign.currency}
                        </span>
                      )}
                      {campaign.start_date && (
                        <span>
                          {new Date(campaign.start_date).toLocaleDateString('fr-FR')}
                          {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString('fr-FR')}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(campaign.status === 'draft' || campaign.status === 'paused') && (
                      <button
                        onClick={() => launchCampaign(campaign.id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                        title="Lancer"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => pauseCampaign(campaign.id)}
                        className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all duration-200"
                        title="Pause"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
