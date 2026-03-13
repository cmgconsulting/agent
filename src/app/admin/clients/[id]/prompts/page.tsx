'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGENTS } from '@/lib/agents-config'
import type { AgentType } from '@/types/database'
import { ArrowLeft, Save, RotateCcw, Loader2, Check, Wand2 } from 'lucide-react'
import Link from 'next/link'

interface AgentData {
  id: string
  type: AgentType
  name: string
  active: boolean
  system_prompt: string | null
}

const DEFAULT_PROMPTS: Record<AgentType, string> = {
  eva: `Tu es Eva, l'agent Reseaux Sociaux. Tu generes des posts engageants pour Facebook et Instagram adaptes au secteur des energies renouvelables (poeles a bois, pompes a chaleur, panneaux solaires). Tu parles en francais, de maniere professionnelle mais accessible. Tu utilises des emojis avec parcimonie.`,
  ludo: `Tu es Ludo, l'agent SAV Client. Tu reponds aux demandes clients avec empathie et efficacite. Tu crees des tickets SAV pour les problemes techniques, tu escalades les cas complexes. Tu parles en francais et tu restes toujours calme et professionnel.`,
  marc: `Tu es Marc, l'agent Emails. Tu tries la boite mail, tu reponds aux demandes de devis, tu geres les newsletters. Tu rediges des emails professionnels en francais, clairs et concis. Tu identifies les emails prioritaires.`,
  leo: `Tu es Leo, l'agent Operationnel. Tu generes les devis avec calcul d'aides MaPrimeRenov et CEE, tu crees les factures via Pennylane, tu relances les impayes. Tu es precis dans les calculs et tu respectes la reglementation francaise.`,
  hugo: `Tu es Hugo, l'agent Marketing & Acquisition. Tu geres les campagnes publicitaires Meta Ads, tu qualifies les leads avec un scoring intelligent, tu nourris les prospects avec des sequences personnalisees. Tu analyses le ROI des campagnes.`,
  sofia: `Tu es Sofia, l'agent Structuration & SOP. Tu generes des organigrammes, tu rediges des procedures operationnelles standard (SOP) claires et actionnables. Tu detectes les gaps de process et tu proposes des ameliorations.`,
  felix: `Tu es Felix, l'agent Finance & Marges. Tu calcules les marges par projet, tu generes des previsions de tresorerie, tu alertes sur les seuils critiques. Tu es rigoureux dans tes analyses financieres.`,
  iris: `Tu es Iris, l'agent Data & Reporting. Tu consolides les KPIs de tous les agents, tu generes des rapports hebdomadaires, tu analyses le ROI par canal d'acquisition. Tu presentes les donnees de facon claire et actionnable.`,
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
    const prompt = `Tu es ${config.name}, l'agent ${config.role} de ${clientName || '[nom entreprise]'}, une entreprise specialisee dans les energies renouvelables (poeles a bois, pompes a chaleur, panneaux solaires).

ROLE: ${config.description}

REGLES:
- Tu parles toujours en francais
- Tu es professionnel mais accessible
- Tu ne prends aucune decision financiere sans validation
- Tu respectes la reglementation francaise en vigueur
- Tu log toutes tes actions pour tracabilite

CONNECTEURS DISPONIBLES: ${config.connectors.join(', ')}`
    setEditedPrompts(prev => ({ ...prev, [agentType]: prompt }))
  }

  const activeConfig = activeTab ? AGENTS.find(a => a.type === activeTab) : null

  return (
    <div>
      <Link href={`/admin/clients/${clientId}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour au client
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Prompts</h1>
          <p className="text-gray-500">{clientName} — Editeur no-code</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegarde !' : 'Tout sauvegarder'}
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
                  activeTab === agent.type ? 'bg-blue-600 text-white' :
                  agent.active ? 'text-gray-700 hover:bg-gray-100' :
                  'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.name}</span>
                {!agent.active && <span className="text-xs ml-auto opacity-60">off</span>}
              </button>
            )
          })}
        </div>

        {/* Editor */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          {activeTab && activeConfig ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeConfig.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{activeConfig.name} — {activeConfig.role}</h3>
                    <p className="text-xs text-gray-500">{activeConfig.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generatePrompt(activeTab)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition"
                  >
                    <Wand2 className="w-3 h-3" /> Generer
                  </button>
                  <button
                    onClick={() => resetToDefault(activeTab)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button
                    onClick={() => savePrompt(activeTab)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" /> Sauver
                  </button>
                </div>
              </div>
              <textarea
                value={editedPrompts[activeTab] || ''}
                onChange={e => setEditedPrompts(prev => ({ ...prev, [activeTab]: e.target.value }))}
                placeholder="Entrez le system prompt pour cet agent..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[300px]"
                rows={15}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  {(editedPrompts[activeTab] || '').length} caracteres — ~{Math.ceil((editedPrompts[activeTab] || '').length / 4)} tokens
                </p>
                <p className="text-xs text-gray-400">
                  Connecteurs: {activeConfig.connectors.join(', ')}
                </p>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-12">Selectionnez un agent</p>
          )}
        </div>
      </div>
    </div>
  )
}
