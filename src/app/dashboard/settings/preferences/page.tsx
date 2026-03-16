'use client'

import { useState, useEffect } from 'react'
import { Brain, Trash2, Plus, Code, MessageSquare, RefreshCw, Check, ChevronDown, Settings } from 'lucide-react'
import { AGENTS } from '@/lib/agents-config'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import { PageHeader } from '@/components/ui/page-header'
import { SectionHelp } from '@/components/ui/help-tooltip'
import type { AgentType } from '@/types/database'

interface Preference {
  id: string
  agent_type: string
  preference_key: string
  preference_value: string
  source: string
  is_active: boolean
  created_at: string
}

interface CustomPrompt {
  id: string
  agent_type: string
  custom_prompt: string
  replace_default: boolean
}

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [prompts, setPrompts] = useState<Record<string, CustomPrompt>>({})
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string>('global')
  const [advancedMode, setAdvancedMode] = useState(false)

  // Nouvelle préférence
  const [newPrefValue, setNewPrefValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Prompt editing
  const [editingPrompt, setEditingPrompt] = useState('')
  const [savingPrompt, setSavingPrompt] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  async function loadPreferences() {
    setLoading(true)
    try {
      const res = await fetch('/api/preferences')
      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferences || [])
      }

      // Charger les prompts personnalisés pour chaque agent
      const promptMap: Record<string, CustomPrompt> = {}
      for (const agent of AGENTS) {
        const res = await fetch(`/api/preferences/prompts?agent_type=${agent.type}`)
        if (res.ok) {
          const data = await res.json()
          if (data.prompt) {
            promptMap[agent.type] = data.prompt
          }
        }
      }
      setPrompts(promptMap)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function addPreference() {
    if (!newPrefValue.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: selectedAgent,
          preference_key: 'custom_' + Date.now(),
          preference_value: newPrefValue.trim(),
          source: 'user',
        }),
      })
      if (res.ok) {
        setNewPrefValue('')
        loadPreferences()
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  async function removePreference(prefId: string) {
    try {
      await fetch('/api/preferences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference_id: prefId }),
      })
      setPreferences(prev => prev.filter(p => p.id !== prefId))
    } catch {
      // silent
    }
  }

  async function savePrompt(agentType: string) {
    setSavingPrompt(true)
    try {
      await fetch('/api/preferences/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: agentType,
          custom_prompt: editingPrompt,
        }),
      })
      setPrompts(prev => ({
        ...prev,
        [agentType]: { ...prev[agentType], custom_prompt: editingPrompt } as CustomPrompt,
      }))
    } catch {
      // silent
    } finally {
      setSavingPrompt(false)
    }
  }

  const filteredPrefs = preferences.filter(p =>
    selectedAgent === 'global' ? true : p.agent_type === selectedAgent || p.agent_type === 'global'
  )

  const agentLabel = selectedAgent === 'global'
    ? 'Tous les agents'
    : AGENTS.find(a => a.type === selectedAgent)?.name || selectedAgent

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageHeader
        icon={Brain}
        title="Préférences IA"
        subtitle="Personnalisez le comportement de vos agents pour qu'ils s'adaptent à vos besoins"
      />

      <div className="mb-6">
        <SectionHelp
          title="Comment ça marche ?"
          description="Vos préférences sont mémorisées et appliquées automatiquement à chaque interaction avec vos agents."
          tips={[
            "Ajoutez des préférences en langage naturel, par exemple : 'Utiliser un ton formel'",
            "Les préférences 'globales' s'appliquent à tous vos agents",
            "Vous pouvez aussi définir des préférences spécifiques par agent",
            "Le mode avancé permet de modifier directement les instructions de chaque agent",
          ]}
        />
      </div>

      {/* Agent selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <select
            value={selectedAgent}
            onChange={(e) => {
              setSelectedAgent(e.target.value)
              if (prompts[e.target.value]) {
                setEditingPrompt(prompts[e.target.value].custom_prompt)
              } else {
                setEditingPrompt('')
              }
            }}
            className="input pr-10 appearance-none"
          >
            <option value="global">Tous les agents (global)</option>
            {AGENTS.map(agent => (
              <option key={agent.type} value={agent.type}>
                {agent.name} — {agent.role}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-ink-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {selectedAgent !== 'global' && (
          <AgentAvatar type={selectedAgent as AgentType} size="sm" />
        )}

        {/* Toggle mode */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setAdvancedMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !advancedMode ? 'bg-brand-400 text-ink-700' : 'bg-surface-100 text-ink-400 hover:text-ink-600'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Simple
          </button>
          <button
            onClick={() => {
              setAdvancedMode(true)
              if (selectedAgent !== 'global' && prompts[selectedAgent]) {
                setEditingPrompt(prompts[selectedAgent].custom_prompt)
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              advancedMode ? 'bg-brand-400 text-ink-700' : 'bg-surface-100 text-ink-400 hover:text-ink-600'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Avancé
          </button>
        </div>
      </div>

      {/* Mode simple — préférences en langage naturel */}
      {!advancedMode && (
        <div className="space-y-4">
          {/* Formulaire d'ajout */}
          <div className="card">
            <h3 className="font-semibold text-ink-700 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-500" />
              Ajouter une préférence pour {agentLabel}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPrefValue}
                onChange={(e) => setNewPrefValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPreference()}
                placeholder="Ex: 'Toujours vouvoyer les clients' ou 'Inclure le numéro RGE dans les devis'"
                className="input flex-1"
              />
              <button
                onClick={addPreference}
                disabled={!newPrefValue.trim() || saving}
                className="btn-brand flex items-center gap-2 whitespace-nowrap"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter
              </button>
            </div>
          </div>

          {/* Liste des préférences existantes */}
          <div className="card">
            <h3 className="font-semibold text-ink-700 mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-brand-500" />
              Préférences actives
              <span className="badge-brand">{filteredPrefs.length}</span>
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-ink-300" />
              </div>
            ) : filteredPrefs.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-3 text-ink-200" />
                <p className="text-ink-300 text-sm">
                  Aucune préférence mémorisée pour {agentLabel}
                </p>
                <p className="text-ink-200 text-xs mt-1">
                  Ajoutez-en une ci-dessus, ou l&apos;IA vous en proposera quand elle détectera que quelque chose ne vous convient pas
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPrefs.map((pref) => {
                  const agentConfig = AGENTS.find(a => a.type === pref.agent_type)
                  return (
                    <div
                      key={pref.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100 group"
                    >
                      {/* Agent avatar ou globe */}
                      <div className="flex-shrink-0">
                        {pref.agent_type === 'global' ? (
                          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                            <Settings className="w-4 h-4 text-brand-500" />
                          </div>
                        ) : agentConfig ? (
                          <AgentAvatar type={pref.agent_type as AgentType} size="sm" />
                        ) : null}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink-700">{pref.preference_value}</p>
                        <p className="text-xs text-ink-300 mt-0.5">
                          {pref.agent_type === 'global' ? 'Tous les agents' : agentConfig?.name || pref.agent_type}
                          {pref.source === 'feedback' && ' · Détecté automatiquement'}
                        </p>
                      </div>

                      {/* Source badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        pref.source === 'feedback' ? 'bg-purple-50 text-purple-600' : 'bg-surface-200 text-ink-400'
                      }`}>
                        {pref.source === 'feedback' ? 'Auto' : 'Manuel'}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={() => removePreference(pref.id)}
                        className="text-ink-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode avancé — édition du prompt */}
      {advancedMode && (
        <div className="space-y-4">
          {selectedAgent === 'global' ? (
            <div className="card">
              <div className="text-center py-8">
                <Code className="w-12 h-12 mx-auto mb-3 text-ink-200" />
                <p className="text-ink-400 text-sm">
                  Le mode avancé s&apos;utilise agent par agent.
                </p>
                <p className="text-ink-300 text-xs mt-1">
                  Sélectionnez un agent spécifique dans le menu ci-dessus.
                </p>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3 className="font-semibold text-ink-700 mb-2 flex items-center gap-2">
                <Code className="w-4 h-4 text-brand-500" />
                Instructions personnalisées pour {agentLabel}
              </h3>
              <p className="text-xs text-ink-400 mb-4">
                Ces instructions seront ajoutées au prompt système de base de l&apos;agent.
                Vous pouvez donner des consignes précises sur le ton, le format, les informations à inclure, etc.
              </p>

              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                placeholder={`Ex:\n- Toujours vouvoyer les clients\n- Inclure le numéro RGE dans les devis\n- Répondre en maximum 3 paragraphes\n- Ne jamais proposer de tarif sans validation`}
                className="input min-h-[200px] resize-y font-mono text-sm"
              />

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-ink-300">
                  {editingPrompt.length} caractères
                </p>
                <button
                  onClick={() => savePrompt(selectedAgent)}
                  disabled={savingPrompt}
                  className="btn-brand flex items-center gap-2"
                >
                  {savingPrompt ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </div>
          )}

          {/* Explication */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700">
              <strong>Mode avancé</strong> — Les instructions personnalisées sont injectées directement
              dans le prompt système de l&apos;agent. Soyez précis et clair dans vos consignes.
              Si le résultat n&apos;est pas celui attendu, vous pouvez revenir au mode simple.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
