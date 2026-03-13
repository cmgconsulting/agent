'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AGENTS, PLAN_AGENTS_LIMIT } from '@/lib/agents-config'
import type { AgentType, PlanType } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    plan: 'basic' as PlanType,
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
        setError(data.error || 'Erreur lors de la creation')
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Erreur reseau')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau client</h1>
      <p className="text-gray-500 mb-8">Creer un compte client et activer ses agents</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identifiants */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identifiants de connexion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="client@entreprise.fr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Min. 8 caracteres"
              />
            </div>
          </div>
        </div>

        {/* Informations entreprise */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations entreprise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du contact</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;entreprise</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
              <input
                type="text"
                value={form.siret}
                onChange={e => setForm(f => ({ ...f, siret: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan tarifaire</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['basic', 'pro', 'full'] as PlanType[]).map((plan) => (
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900 capitalize">{plan}</p>
                <p className="text-sm text-gray-500">{PLAN_AGENTS_LIMIT[plan]} agents</p>
                <p className="text-sm text-gray-500 mt-1">
                  {plan === 'basic' ? '400' : plan === 'pro' ? '600' : '800'} &euro;/mois
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Agents actifs</h2>
            <span className="text-sm text-gray-500">
              {form.activeAgents.length} / {maxAgents} selectionnes
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
                      ? 'border-blue-500 bg-blue-50'
                      : isDisabled
                        ? 'border-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creation...' : 'Creer le client'}
          </button>
          <Link
            href="/admin"
            className="px-8 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
