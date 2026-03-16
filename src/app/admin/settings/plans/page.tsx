'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Save, Loader2, Edit2, Infinity } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { SectionHelp } from '@/components/ui/help-tooltip'

interface BillingPlan {
  id: string
  name: string
  display_name: string
  description: string
  monthly_token_quota: number
  price_monthly: number
  price_yearly: number
  max_agents: number
  max_documents: number
  max_connectors: number
  max_team_members: number
  features: Record<string, boolean> | null
  is_active: boolean
  sort_order: number
}

const FEATURE_LABELS: Record<string, string> = {
  workflows: 'Workflows automatisés',
  branding: 'Personnalisation branding',
  social_media: 'Réseaux sociaux',
  advanced_analytics: 'Analytics avancés',
  priority_support: 'Support prioritaire',
  crm_integration: 'Intégration CRM',
  custom_connectors: 'Connecteurs personnalisés',
  knowledge_base: 'Base de connaissances',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 0)}K`
  return n.toString()
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'border-emerald-200 bg-emerald-50/30',
  pro: 'border-blue-200 bg-blue-50/30',
  enterprise: 'border-purple-200 bg-purple-50/30',
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-emerald-100 text-emerald-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

export default function PlansSettingsPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings/plans')
      const data = await res.json()
      if (data.plans) setPlans(data.plans)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  async function handleSavePlan() {
    if (!editingPlan) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan),
      })
      const data = await res.json()
      if (data.plan) {
        setPlans(prev => prev.map(p => p.id === data.plan.id ? data.plan : p))
        setEditingPlan(null)
        setToast({ type: 'success', message: `Plan "${data.plan.display_name}" mis à jour` })
      } else {
        setToast({ type: 'error', message: data.error || 'Erreur' })
      }
    } catch {
      setToast({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse">
            <div className="h-6 bg-surface-100 rounded w-24 mb-4" />
            <div className="h-8 bg-surface-100 rounded w-32 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(j => <div key={j} className="h-4 bg-surface-100 rounded" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHelp
        title="Plans & Tarifs"
        description="Gérez les plans d'abonnement, quotas et fonctionnalités incluses."
        tips={[
          'Les modifications s\'appliquent aux nouveaux abonnements',
          '-1 signifie illimité pour les quotas',
        ]}
      />

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`card border-2 ${PLAN_COLORS[plan.name] || 'border-surface-200'} ${!plan.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${PLAN_BADGE[plan.name] || 'bg-surface-100 text-ink-600'}`}>
                {plan.display_name}
              </span>
              {!plan.is_active && (
                <span className="text-xs text-ink-300">Inactif</span>
              )}
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-ink-700">{plan.price_monthly}€</span>
              <span className="text-ink-300 text-sm">/mois</span>
              {plan.price_yearly > 0 && (
                <p className="text-xs text-ink-300 mt-1">{plan.price_yearly}€/an</p>
              )}
            </div>

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Tokens</span>
                <span className="font-medium">{formatTokens(plan.monthly_token_quota)}/mois</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Agents</span>
                <span className="font-medium flex items-center gap-1">
                  {plan.max_agents < 0 ? <><Infinity className="w-4 h-4" /> Illimité</> : plan.max_agents}
                </span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Documents</span>
                <span className="font-medium">{plan.max_documents < 0 ? 'Illimité' : plan.max_documents}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Connecteurs</span>
                <span className="font-medium">{plan.max_connectors < 0 ? 'Illimité' : plan.max_connectors}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Membres équipe</span>
                <span className="font-medium">{plan.max_team_members < 0 ? 'Illimité' : plan.max_team_members}</span>
              </div>
            </div>

            {plan.features && (
              <div className="border-t border-surface-100 pt-4 mb-4">
                <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Fonctionnalités</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(plan.features)
                    .filter(([, v]) => v)
                    .map(([key]) => (
                      <span key={key} className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-ink-500">
                        {FEATURE_LABELS[key] || key}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setEditingPlan({ ...plan })}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ink-700">
                Modifier le plan {editingPlan.display_name}
              </h2>
              <button onClick={() => setEditingPlan(null)} className="text-ink-300 hover:text-ink-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Nom d&apos;affichage</label>
                  <input
                    type="text"
                    className="input"
                    value={editingPlan.display_name}
                    onChange={e => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Identifiant</label>
                  <input type="text" className="input bg-surface-50" value={editingPlan.name} disabled />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-600 mb-2">Description</label>
                <textarea
                  className="input min-h-[80px]"
                  value={editingPlan.description || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Prix mensuel (€)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.price_monthly}
                    onChange={e => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Prix annuel (€)</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.price_yearly}
                    onChange={e => setEditingPlan({ ...editingPlan, price_yearly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Quota tokens/mois</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.monthly_token_quota}
                    onChange={e => setEditingPlan({ ...editingPlan, monthly_token_quota: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-ink-300 mt-1">{formatTokens(editingPlan.monthly_token_quota)} tokens</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Max agents</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.max_agents}
                    onChange={e => setEditingPlan({ ...editingPlan, max_agents: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-ink-300 mt-1">-1 = illimité</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Max documents</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.max_documents}
                    onChange={e => setEditingPlan({ ...editingPlan, max_documents: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Max connecteurs</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.max_connectors}
                    onChange={e => setEditingPlan({ ...editingPlan, max_connectors: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-600 mb-2">Max membres</label>
                  <input
                    type="number"
                    className="input"
                    value={editingPlan.max_team_members}
                    onChange={e => setEditingPlan({ ...editingPlan, max_team_members: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-semibold text-ink-600 mb-3">Fonctionnalités incluses</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <Toggle
                      key={key}
                      checked={editingPlan.features?.[key] ?? false}
                      onChange={v => setEditingPlan({
                        ...editingPlan,
                        features: { ...(editingPlan.features || {}), [key]: v },
                      })}
                      label={label}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t border-surface-100 pt-4">
                <Toggle
                  checked={editingPlan.is_active}
                  onChange={v => setEditingPlan({ ...editingPlan, is_active: v })}
                  label="Plan actif (visible pour les clients)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingPlan(null)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleSavePlan} disabled={saving} className="btn-brand flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
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
