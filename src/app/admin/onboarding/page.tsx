'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGENTS, PLAN_AGENTS_LIMIT, PLAN_LABELS } from '@/lib/agents-config'
import type { PlanType, AgentType, ConnectorType } from '@/types/database'
import {
  Building2, Bot, Plug, Settings, Rocket,
  ChevronRight, ChevronLeft, Check, AlertCircle, Loader2
} from 'lucide-react'

type OnboardingStep = 1 | 2 | 3 | 4 | 5

const STEPS = [
  { num: 1, label: 'Profil', icon: Building2, desc: 'Infos entreprise & plan' },
  { num: 2, label: 'Agents', icon: Bot, desc: 'Selection des agents' },
  { num: 3, label: 'Connecteurs', icon: Plug, desc: 'APIs & integrations' },
  { num: 4, label: 'Config', icon: Settings, desc: 'System prompts' },
  { num: 5, label: 'Go Live', icon: Rocket, desc: 'Activation finale' },
]

const CONNECTOR_OPTIONS: { type: ConnectorType; label: string; icon: string; forAgents: AgentType[] }[] = [
  { type: 'gmail', label: 'Gmail', icon: '📧', forAgents: ['marc', 'ludo', 'leo'] },
  { type: 'whatsapp', label: 'WhatsApp', icon: '💬', forAgents: ['ludo'] },
  { type: 'twilio', label: 'Twilio SMS', icon: '📱', forAgents: ['ludo', 'hugo'] },
  { type: 'meta_api', label: 'Meta (Facebook/IG)', icon: '📘', forAgents: ['eva'] },
  { type: 'meta_ads', label: 'Meta Ads', icon: '🎯', forAgents: ['hugo'] },
  { type: 'pennylane', label: 'Pennylane', icon: '💰', forAgents: ['leo', 'felix'] },
  { type: 'notion', label: 'Notion', icon: '📝', forAgents: ['sofia'] },
  { type: 'google_analytics', label: 'Google Analytics', icon: '📊', forAgents: ['iris'] },
  { type: 'airtable', label: 'Airtable', icon: '📋', forAgents: ['ludo', 'hugo', 'sofia', 'iris'] },
  { type: 'google_sheets', label: 'Google Sheets', icon: '📗', forAgents: ['felix'] },
]

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const clientId = searchParams.get('client')

  const [step, setStep] = useState<OnboardingStep>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Array<{ id: string; company_name: string; plan: PlanType; onboarded_at: string | null }>>([])
  const [selectedClientId, setSelectedClientId] = useState(clientId || '')

  // Step 1 data
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [siret, setSiret] = useState('')
  const [plan, setPlan] = useState<PlanType>('pro')

  // Step 2 data
  const [selectedAgents, setSelectedAgents] = useState<AgentType[]>([])

  // Step 3 data
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>([])

  // Step 4 data
  const [prompts, setPrompts] = useState<Record<string, string>>({})

  // Load clients list
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from('clients')
        .select('id, company_name, plan, onboarded_at')
        .order('created_at', { ascending: false })
      if (data) setClients(data as Array<{ id: string; company_name: string; plan: PlanType; onboarded_at: string | null }>)
    }
    loadClients()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load selected client data
  useEffect(() => {
    if (!selectedClientId) return
    async function loadClient() {
      setLoading(true)
      const { data: client } = await supabase.from('clients').select('*').eq('id', selectedClientId).single()
      if (client) {
        setCompanyName(client.company_name)
        setPhone(client.phone || '')
        setAddress(client.address || '')
        setSiret(client.siret || '')
        setPlan(client.plan as PlanType)
      }
      const { data: agents } = await supabase.from('agents').select('*').eq('client_id', selectedClientId)
      if (agents) {
        setSelectedAgents(agents.filter(a => a.active).map(a => a.type as AgentType))
        const promptMap: Record<string, string> = {}
        agents.forEach(a => { if (a.system_prompt) promptMap[a.type] = a.system_prompt })
        setPrompts(promptMap)
      }
      const { data: connectors } = await supabase.from('connectors').select('*').eq('client_id', selectedClientId)
      if (connectors) {
        setSelectedConnectors(connectors.map(c => c.type as ConnectorType))
      }
      setLoading(false)
    }
    loadClient()
  }, [selectedClientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const planLimit = PLAN_AGENTS_LIMIT[plan]

  function toggleAgent(agentType: AgentType) {
    setSelectedAgents(prev => {
      if (prev.includes(agentType)) return prev.filter(a => a !== agentType)
      if (prev.length >= planLimit) return prev
      return [...prev, agentType]
    })
  }

  function toggleConnector(type: ConnectorType) {
    setSelectedConnectors(prev =>
      prev.includes(type) ? prev.filter(c => c !== type) : [...prev, type]
    )
  }

  async function saveStep(nextStep: OnboardingStep) {
    if (!selectedClientId) {
      setError('Selectionnez un client d\'abord')
      return
    }
    setLoading(true)
    setError('')

    try {
      switch (step) {
        case 1: {
          await supabase.from('clients').update({
            company_name: companyName,
            phone: phone || null,
            address: address || null,
            siret: siret || null,
            plan,
          }).eq('id', selectedClientId)
          break
        }
        case 2: {
          // Update agents active status
          const { data: agents } = await supabase.from('agents').select('*').eq('client_id', selectedClientId)
          if (agents) {
            for (const agent of agents) {
              const shouldBeActive = selectedAgents.includes(agent.type as AgentType)
              if (agent.active !== shouldBeActive) {
                await supabase.from('agents').update({ active: shouldBeActive }).eq('id', agent.id)
              }
            }
          }
          // Update client active_agents array
          await supabase.from('clients').update({ active_agents: selectedAgents }).eq('id', selectedClientId)
          break
        }
        case 3: {
          // Create connectors that don't exist
          const { data: existing } = await supabase.from('connectors').select('type').eq('client_id', selectedClientId)
          const existingTypes = existing?.map(c => c.type) || []
          for (const connType of selectedConnectors) {
            if (!existingTypes.includes(connType)) {
              await supabase.from('connectors').insert({
                client_id: selectedClientId,
                type: connType,
                label: connType,
                status: 'inactive',
                config: {},
              })
            }
          }
          break
        }
        case 4: {
          // Update system prompts
          for (const [agentType, prompt] of Object.entries(prompts)) {
            if (prompt.trim()) {
              await supabase.from('agents')
                .update({ system_prompt: prompt })
                .eq('client_id', selectedClientId)
                .eq('type', agentType)
            }
          }
          break
        }
        case 5: {
          // Mark as onboarded
          await supabase.from('clients').update({
            onboarded_at: new Date().toISOString(),
            is_active: true,
          }).eq('id', selectedClientId)
          router.push(`/admin/clients/${selectedClientId}`)
          return
        }
      }
      setStep(nextStep)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Client</h1>
        <p className="text-gray-500">Guide de configuration en 5 etapes</p>
      </div>

      {/* Client selector */}
      {!clientId && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selectionner un client</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Choisir un client --</option>
            {clients.filter(c => !c.onboarded_at).map(c => (
              <option key={c.id} value={c.id}>{c.company_name} ({PLAN_LABELS[c.plan]})</option>
            ))}
            <optgroup label="Deja onboarde">
              {clients.filter(c => c.onboarded_at).map(c => (
                <option key={c.id} value={c.id}>{c.company_name} ✓</option>
              ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 ${
              step === s.num ? 'bg-blue-600 text-white' :
              step > s.num ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step > s.num ? (
                <Check className="w-4 h-4" />
              ) : (
                <s.icon className="w-4 h-4" />
              )}
              <div className="hidden md:block">
                <p className="text-xs font-semibold">{s.label}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Profil entreprise</h2>
            <p className="text-sm text-gray-500 mb-6">Informations de base et choix du plan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;entreprise *</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                <input type="text" value={siret} onChange={e => setSiret(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Plan tarifaire</label>
              <div className="grid grid-cols-3 gap-4">
                {(['basic', 'pro', 'full'] as PlanType[]).map(p => {
                  const prices = { basic: 99, pro: 249, full: 499 }
                  const limits = PLAN_AGENTS_LIMIT
                  return (
                    <button key={p} onClick={() => setPlan(p)}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        plan === p ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <p className="font-bold text-gray-900">{PLAN_LABELS[p]}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{prices[p]}€<span className="text-sm font-normal text-gray-500">/mois</span></p>
                      <p className="text-sm text-gray-500 mt-1">{limits[p]} agents max</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Agents */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Selection des agents</h2>
            <p className="text-sm text-gray-500 mb-6">
              Choisissez jusqu&apos;a {planLimit} agents (plan {PLAN_LABELS[plan]}) —
              <span className="font-medium"> {selectedAgents.length}/{planLimit} selectionne(s)</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AGENTS.map(agent => {
                const isSelected = selectedAgents.includes(agent.type)
                const isDisabled = !isSelected && selectedAgents.length >= planLimit
                return (
                  <button key={agent.type} onClick={() => !isDisabled && toggleAgent(agent.type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition ${
                      isSelected ? 'border-blue-500 bg-blue-50' :
                      isDisabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                      'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="text-2xl">{agent.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">{agent.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          agent.category === 'strategie' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {agent.category === 'strategie' ? 'Strategie' : 'Communication'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">{agent.role}</p>
                      <p className="text-xs text-gray-400 mt-1">{agent.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Connectors */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Connecteurs</h2>
            <p className="text-sm text-gray-500 mb-6">Selectionnez les integrations a configurer. Les credentials seront renseignes ensuite.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONNECTOR_OPTIONS.map(conn => {
                const isRelevant = conn.forAgents.some(a => selectedAgents.includes(a))
                const isSelected = selectedConnectors.includes(conn.type)
                return (
                  <button key={conn.type} onClick={() => toggleConnector(conn.type)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition ${
                      isSelected ? 'border-blue-500 bg-blue-50' :
                      isRelevant ? 'border-gray-200 hover:border-gray-300' :
                      'border-gray-100 bg-gray-50 opacity-60'
                    }`}>
                    <span className="text-xl">{conn.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{conn.label}</p>
                      <p className="text-xs text-gray-400">
                        {conn.forAgents.map(a => AGENTS.find(ag => ag.type === a)?.name).filter(Boolean).join(', ')}
                      </p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                    {isRelevant && !isSelected && <span className="text-xs text-amber-500 font-medium">Recommande</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 4: System Prompts */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuration des prompts</h2>
            <p className="text-sm text-gray-500 mb-6">Personnalisez le comportement de chaque agent (optionnel — des prompts par defaut seront utilises sinon).</p>
            <div className="space-y-4">
              {selectedAgents.map(agentType => {
                const config = AGENTS.find(a => a.type === agentType)!
                return (
                  <div key={agentType} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{config.icon}</span>
                      <p className="font-semibold text-gray-900">{config.name} — {config.role}</p>
                    </div>
                    <textarea
                      value={prompts[agentType] || ''}
                      onChange={e => setPrompts(prev => ({ ...prev, [agentType]: e.target.value }))}
                      placeholder={`Ex: Tu es ${config.name}, l'agent ${config.role} de [nom entreprise]. Tu parles en francais, de maniere professionnelle...`}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                      rows={4}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 5: Go Live */}
        {step === 5 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pret a lancer !</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Verifiez le resume ci-dessous et cliquez sur &quot;Activer&quot; pour finaliser l&apos;onboarding.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 text-left max-w-lg mx-auto">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Entreprise</span>
                  <span className="text-sm font-medium text-gray-900">{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className="text-sm font-medium text-gray-900">{PLAN_LABELS[plan]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Agents actifs</span>
                  <span className="text-sm font-medium text-gray-900">{selectedAgents.length}/{planLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Connecteurs</span>
                  <span className="text-sm font-medium text-gray-900">{selectedConnectors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Prompts personnalises</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Object.values(prompts).filter(p => p.trim()).length}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">Agents: {selectedAgents.map(a => AGENTS.find(ag => ag.type === a)?.name).join(', ')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((step - 1) as OnboardingStep)}
          disabled={step === 1}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
            step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Precedent
        </button>
        <button
          onClick={() => saveStep(step === 5 ? 5 : ((step + 1) as OnboardingStep))}
          disabled={loading || !selectedClientId}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {step === 5 ? '🚀 Activer le client' : 'Suivant'}
          {step < 5 && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
