'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGENTS } from '@/lib/agents-config'
import type { AgentType } from '@/types/database'
import { ArrowLeft, Save, RotateCcw, Loader2, Check, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { AgentAvatar } from '@/components/agents/agent-avatars'

interface AgentData {
  id: string
  type: AgentType
  name: string
  active: boolean
  system_prompt: string | null
}

const DEFAULT_PROMPTS: Record<AgentType, string> = {
  eva: `Tu es Eva, l'agent Réseaux Sociaux. Tu génères des posts engageants pour Facebook et Instagram adaptés au secteur des énergies renouvelables (poêles à bois, pompes à chaleur, panneaux solaires). Tu parles en français, de manière professionnelle mais accessible. Tu utilises des emojis avec parcimonie.`,
  ludo: `Tu es Ludo, l'agent SAV Client. Tu réponds aux demandes clients avec empathie et efficacité. Tu crées des tickets SAV pour les problèmes techniques, tu escalades les cas complexes. Tu parles en français et tu restes toujours calme et professionnel.`,
  marc: `Tu es Marc, l'agent Emails. Tu tries la boîte mail, tu réponds aux demandes de devis, tu gères les newsletters. Tu rédiges des emails professionnels en français, clairs et concis. Tu identifies les emails prioritaires.`,
  leo: `Tu es Léo, l'agent Opérationnel. Tu génères les devis avec calcul d'aides MaPrimeRénov et CEE, tu crées les factures via Pennylane, tu relances les impayés. Tu es précis dans les calculs et tu respectes la réglementation française.`,
  hugo: `Tu es Hugo, l'agent Marketing & Acquisition. Tu gères les campagnes publicitaires Meta Ads, tu qualifies les leads avec un scoring intelligent, tu nourris les prospects avec des séquences personnalisées. Tu analyses le ROI des campagnes.`,
  sofia: `Tu es Sofia, l'agent Structuration & SOP. Tu génères des organigrammes, tu rédiges des procédures opérationnelles standard (SOP) claires et actionnables. Tu détectes les gaps de process et tu proposes des améliorations.`,
  felix: `Tu es Félix, l'agent Finance & Marges. Tu calcules les marges par projet, tu génères des prévisions de trésorerie, tu alertes sur les seuils critiques. Tu es rigoureux dans tes analyses financières.`,
  iris: `Tu es Iris, l'agent Data & Reporting. Tu consolides les KPIs de tous les agents, tu génères des rapports hebdomadaires, tu analyses le ROI par canal d'acquisition. Tu présentes les données de façon claire et actionnable.`,
}

export default function PromptsEditorPage() {
  const params = useParams()
  const supabase = createClient()
  const clientId = params.id as string

  const [agents, setAgents] = useState<AgentData[]>([])
  const [activeTab, setActiveTab] = useState<AgentType | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: client }, { data: agentsData }] = await Promise.all([
        supabase.from('clients').select('company_name').eq('id', clientId).single(),
        supabase.from('agents').select('*').eq('client_id', clientId).order('type'),
      ])
      if (client) setClientName(client.company_name)
      if (agentsData) {
        setAgents(agentsData as AgentData[])
        const prompts: Record<string, string> = {}
        agentsData.forEach((a: AgentData) => {
          prompts[a.type] = a.system_prompt || ''
        })
        setEditedPrompts(prompts)
        if (agentsData.length > 0) setActiveTab(agentsData[0].type as AgentType)
      }
    }
    load()
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function savePrompt(agentType: AgentType) {
    setSaving(true)
    const prompt = editedPrompts[agentType]
    await supabase
      .from('agents')
      .update({ system_prompt: prompt || null })
      .eq('client_id', clientId)
      .eq('type', agentType)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveAll() {
    setSaving(true)
    for (const [agentType, prompt] of Object.entries(editedPrompts)) {
      await supabase
        .from('agents')
        .update({ system_prompt: prompt || null })
        .eq('client_id', clientId)
        .eq('type', agentType)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function resetToDefault(agentType: AgentType) {
    const defaultPrompt = DEFAULT_PROMPTS[agentType] || ''
    const companyPrompt = defaultPrompt.replace('[nom entreprise]', clientName || '[nom entreprise]')
    setEditedPrompts(prev => ({ ...prev, [agentType]: companyPrompt }))
  }

  function generatePrompt(agentType: AgentType) {
    const config = AGENTS.find(a => a.type === agentType)!
    const prompt = `Tu es ${config.name}, l'agent ${config.role} de ${clientName || '[nom entreprise]'}, une entreprise spécialisée dans les énergies renouvelables (poêles à bois, pompes à chaleur, panneaux solaires).

RÔLE: ${config.description}

RÈGLES:
- Tu parles toujours en français
- Tu es professionnel mais accessible
- Tu ne prends aucune décision financière sans validation
- Tu respectes la réglementation française en vigueur
- Tu log toutes tes actions pour traçabilité

CONNECTEURS DISPONIBLES: ${config.connectors.join(', ')}`
    setEditedPrompts(prev => ({ ...prev, [agentType]: prompt }))
  }

  const activeConfig = activeTab ? AGENTS.find(a => a.type === activeTab) : null

  return (
    <div className="animate-fade-in">
      <Link href={`/admin/clients/${clientId}`} className="flex items-center gap-2 text-ink-400 hover:text-ink-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour au client
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-700">System Prompts</h1>
          <p className="text-ink-400">{clientName} — Éditeur no-code</p>
        </div>
        <button onClick={saveAll} disabled={saving} className="btn-brand">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé !' : 'Tout sauvegarder'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Agent tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {agents.map(agent => {
            const config = AGENTS.find(a => a.type === agent.type)
            if (!config) return null
            return (
              <button
                key={agent.type}
                onClick={() => setActiveTab(agent.type as AgentType)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition ${
                  activeTab === agent.type ? 'bg-brand-500 text-white' :
                  agent.active ? 'text-ink-600 hover:bg-surface-50' :
                  'text-ink-300 hover:bg-surface-50'
                }`}
              >
                <AgentAvatar type={config.type as AgentType} size="sm" />
                <span>{config.name}</span>
                {!agent.active && <span className="text-xs ml-auto opacity-60">off</span>}
              </button>
            )
          })}
        </div>

        {/* Editor */}
        <div className="flex-1 card">
          {activeTab && activeConfig ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AgentAvatar type={activeConfig.type as AgentType} size="sm" />
                  <div>
                    <h3 className="font-semibold text-ink-700">{activeConfig.name} — {activeConfig.role}</h3>
                    <p className="text-xs text-ink-400">{activeConfig.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generatePrompt(activeTab)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                  >
                    <Wand2 className="w-3 h-3" /> Générer
                  </button>
                  <button
                    onClick={() => resetToDefault(activeTab)}
                    className="btn-secondary text-xs py-1.5"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    onClick={() => savePrompt(activeTab)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" /> Sauver
                  </button>
                </div>
              </div>
              <textarea
                value={editedPrompts[activeTab] || ''}
                onChange={e => setEditedPrompts(prev => ({ ...prev, [activeTab]: e.target.value }))}
                placeholder="Entrez le system prompt pour cet agent..."
                className="w-full border border-surface-200 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-y min-h-[300px]"
                rows={15}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-ink-300">
                  {(editedPrompts[activeTab] || '').length} caractères — ~{Math.ceil((editedPrompts[activeTab] || '').length / 4)} tokens
                </p>
                <p className="text-xs text-ink-300">
                  Connecteurs: {activeConfig.connectors.join(', ')}
                </p>
              </div>
            </>
          ) : (
            <p className="text-ink-400 text-center py-12">Sélectionnez un agent</p>
          )}
        </div>
      </div>
    </div>
  )
}
