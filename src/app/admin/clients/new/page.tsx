'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AGENTS, PLAN_AGENTS_LIMIT } from '@/lib/agents-config'
import type { AgentType, PlanType } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AgentAvatar } from '@/components/agents/agent-avatars'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    plan: 'starter' as PlanType,
    phone: '',
    address: '',
    siret: '',
    activeAgents: [] as AgentType[],
  })

  const maxAgents = PLAN_AGENTS_LIMIT[form.plan]

  function toggleAgent(type: AgentType) {
    setForm(prev => {
      const has = prev.activeAgents.includes(type)
      if (has) {
        return { ...prev, activeAgents: prev.activeAgents.filter(a => a !== type) }
      }
      if (prev.activeAgents.length >= maxAgents) return prev
      return { ...prev, activeAgents: [...prev.activeAgents, type] }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Erreur réseau')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <Link href="/admin" className="flex items-center gap-2 text-ink-400 hover:text-ink-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      <h1 className="text-2xl font-bold text-ink-700 mb-2">Nouveau client</h1>
      <p className="text-ink-400 mb-8">Créer un compte client et activer ses agents</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identifiants */}
        <div className="card">
          <h2 className="section-title mb-4">Identifiants de connexion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="client@entreprise.fr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input"
                placeholder="Min. 8 caractères"
              />
            </div>
          </div>
        </div>

        {/* Informations entreprise */}
        <div className="card">
          <h2 className="section-title mb-4">Informations entreprise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Nom du contact</label>
              <input type="text" required value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Nom de l&apos;entreprise</label>
              <input type="text" required value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">Téléphone</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-600 mb-1">SIRET</label>
              <input type="text" value={form.siret}
                onChange={e => setForm(f => ({ ...f, siret: e.target.value }))} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink-600 mb-1">Adresse</label>
              <input type="text" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" />
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="card">
          <h2 className="section-title mb-4">Plan tarifaire</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['starter', 'pro', 'enterprise'] as PlanType[]).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setForm(f => ({
                  ...f,
                  plan,
                  activeAgents: f.activeAgents.slice(0, PLAN_AGENTS_LIMIT[plan]),
                }))}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  form.plan === plan
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <p className="font-semibold text-ink-700 capitalize">{plan}</p>
                <p className="text-sm text-ink-400">{PLAN_AGENTS_LIMIT[plan] === -1 ? 'Illimité' : `${PLAN_AGENTS_LIMIT[plan]} agents`}</p>
                <p className="text-sm text-ink-400 mt-1">
                  {plan === 'starter' ? '29' : plan === 'pro' ? '79' : '199'} &euro;/mois
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Agents actifs</h2>
            <span className="text-sm text-ink-400">
              {form.activeAgents.length} / {maxAgents} sélectionnés
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AGENTS.map((agent) => {
              const isSelected = form.activeAgents.includes(agent.type)
              const isDisabled = !isSelected && form.activeAgents.length >= maxAgents
              return (
                <button
                  key={agent.type}
                  type="button"
                  onClick={() => toggleAgent(agent.type)}
                  disabled={isDisabled}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition ${
                    isSelected
                      ? 'border-brand-400 bg-brand-50'
                      : isDisabled
                        ? 'border-surface-100 opacity-50 cursor-not-allowed'
                        : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <AgentAvatar type={agent.type as AgentType} size="sm" />
                  <div>
                    <p className="font-medium text-ink-700">{agent.name}</p>
                    <p className="text-xs text-ink-400">{agent.role}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
        )}

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="btn-brand px-8">
            {loading ? 'Création...' : 'Créer le client'}
          </button>
          <Link href="/admin" className="btn-ghost px-8">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
