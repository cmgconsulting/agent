'use client'

import { useState } from 'react'
import { RefreshCw, Brain, Lightbulb, X, Check, PenLine } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   FEEDBACK ASSISTANT — Détection d'insatisfaction & auto-amélioration

   Ce composant apparaît automatiquement quand l'utilisateur exprime
   une insatisfaction dans le chat. Il propose :
   1. Reformuler la demande (retry avec un prompt amélioré)
   2. Mémoriser une préférence (pour les futures interactions)
   3. Modifier le prompt (mode avancé)
   ═══════════════════════════════════════════════════════════════ */

// Patterns de détection d'insatisfaction en français
const DISSATISFACTION_PATTERNS = [
  // Insatisfaction directe
  /\b(non|pas)\s+(ce\s+que|ça|cela|le\s+résultat|bon|correct|bien)/i,
  /\bc['']est\s+(pas|n['']est\s+pas)\s+(ce|ça|bon|correct|bien)/i,
  /\b(mauvais|incorrect|faux|nul|horrible|affreux)\b/i,
  /\b(pas\s+du\s+tout|absolument\s+pas|vraiment\s+pas)\b/i,

  // Demande de refaire
  /\b(refais|recommence|réessaie|refait|redo|retry)\b/i,
  /\b(essaie\s+encore|encore\s+une\s+fois|une\s+autre\s+fois)\b/i,
  /\b(peux[- ]tu\s+refaire|tu\s+peux\s+refaire)\b/i,

  // Insatisfaction sur le style/ton
  /\b(trop\s+(formel|informel|long|court|vague|technique|compliqué|simple))\b/i,
  /\b(pas\s+assez\s+(formel|précis|détaillé|professionnel|clair))\b/i,
  /\b(je\s+(voulais|veux|préfère|préférerais|souhaite|aimerais)\s+(un|une|que|du|des|le|la|plutôt))/i,

  // Correction explicite
  /\b(non[\s,]+je\s+(voulais|veux|cherche|demandais))\b/i,
  /\b(plutôt|au\s+lieu\s+de|à\s+la\s+place|en\s+fait)\b/i,
  /\b(change|modifie|corrige|ajuste|adapte)\b/i,

  // Insatisfaction implicite
  /\b(ça\s+(ne\s+)?marche\s+pas|ça\s+va\s+pas|ça\s+convient\s+pas)\b/i,
  /\b(j['']aime\s+pas|je\s+n['']aime\s+pas|pas\s+satisfait|déçu)\b/i,
]

// Catégories de préférences détectées automatiquement
const PREFERENCE_SUGGESTIONS: Record<string, { key: string; label: string; value: string }[]> = {
  tone: [
    { key: 'tone', label: 'Ton plus formel', value: 'Utiliser un ton formel et professionnel dans toutes les communications' },
    { key: 'tone', label: 'Ton plus décontracté', value: 'Utiliser un ton amical et décontracté, tutoiement accepté' },
    { key: 'tone', label: 'Ton technique', value: 'Utiliser un vocabulaire technique précis du métier ENR' },
  ],
  format: [
    { key: 'format', label: 'Réponses plus courtes', value: 'Privilégier des réponses concises et directes, maximum 3-4 lignes' },
    { key: 'format', label: 'Réponses plus détaillées', value: 'Fournir des réponses détaillées avec explications et exemples' },
    { key: 'format', label: 'Format liste à puces', value: 'Structurer les réponses avec des listes à puces quand possible' },
  ],
  content: [
    { key: 'pricing', label: 'Toujours inclure les prix TTC', value: 'Toujours mentionner les prix TTC dans les devis et communications' },
    { key: 'legal', label: 'Mentions légales auto', value: 'Inclure automatiquement les mentions légales obligatoires (RGE, assurance, etc.)' },
    { key: 'signature', label: 'Signature entreprise', value: 'Terminer chaque email par la signature officielle de l\'entreprise' },
  ],
}

interface FeedbackAssistantProps {
  agentType: string
  agentName: string
  userMessage: string // Le message original
  agentResponse: string // La réponse insatisfaisante
  dissatisfactionMessage: string // Le message d'insatisfaction
  onRetry: (newPrompt: string) => void // Relancer avec un nouveau prompt
  onPreferenceSaved: (pref: { key: string; value: string }) => void // Préférence mémorisée
  onDismiss: () => void // Fermer sans action
}

export function FeedbackAssistant({
  agentType,
  agentName,
  userMessage,
  agentResponse,
  dissatisfactionMessage,
  onRetry,
  onPreferenceSaved,
  onDismiss,
}: FeedbackAssistantProps) {
  const [mode, setMode] = useState<'suggest' | 'custom_preference' | 'edit_prompt'>('suggest')
  const [customPreference, setCustomPreference] = useState('')
  const [editedPrompt, setEditedPrompt] = useState(userMessage)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Détecter la catégorie d'insatisfaction
  const suggestedCategory = detectCategory(dissatisfactionMessage)

  async function handleSavePreference(key: string, value: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: agentType,
          preference_key: key,
          preference_value: value,
          source: 'feedback',
        }),
      })
      if (res.ok) {
        onPreferenceSaved({ key, value })
        setSaved(true)

        // Sauvegarder dans l'historique de feedback
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: agentType,
            user_message: userMessage,
            agent_response: agentResponse,
            dissatisfaction_message: dissatisfactionMessage,
            resolution_type: 'preference_saved',
          }),
        })
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCustomPreference() {
    if (!customPreference.trim()) return
    await handleSavePreference('custom_' + Date.now(), customPreference.trim())
  }

  function handleRetry() {
    onRetry(editedPrompt)

    // Log le feedback
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_type: agentType,
        user_message: userMessage,
        agent_response: agentResponse,
        dissatisfaction_message: dissatisfactionMessage,
        resolution_type: 'retry',
      }),
    }).catch(() => {})
  }

  if (saved) {
    return (
      <div className="mx-4 mb-2 animate-fade-in">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <Check className="w-4 h-4" />
            <p className="text-sm font-medium">
              Préférence mémorisée ! {agentName} s&apos;en souviendra pour les prochaines fois.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-2 animate-slide-up">
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-400 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-700">
                Le résultat ne vous convient pas ?
              </p>
              <p className="text-xs text-ink-400">
                Améliorons la réponse ensemble
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-ink-300 hover:text-ink-500 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode: Suggestions */}
        {mode === 'suggest' && (
          <div className="space-y-3">
            {/* Option 1: Reformuler */}
            <button
              onClick={() => setMode('edit_prompt')}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-200 hover:border-brand-300 hover:shadow-soft transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-700">Reformuler ma demande</p>
                <p className="text-xs text-ink-400">Modifier votre message et relancer {agentName}</p>
              </div>
            </button>

            {/* Option 2: Mémoriser une préférence (suggestions auto) */}
            {suggestedCategory && PREFERENCE_SUGGESTIONS[suggestedCategory] && (
              <div>
                <p className="text-xs text-ink-400 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Mémoriser une préférence pour que {agentName} s&apos;améliore :
                </p>
                <div className="space-y-1.5">
                  {PREFERENCE_SUGGESTIONS[suggestedCategory].map((pref) => (
                    <button
                      key={pref.label}
                      onClick={() => handleSavePreference(pref.key, pref.value)}
                      disabled={saving}
                      className="w-full flex items-center gap-2 p-2.5 bg-white rounded-lg border border-surface-200 hover:border-brand-300 transition-all text-left text-sm disabled:opacity-50"
                    >
                      <Brain className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                      <span className="text-ink-600">{pref.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Option 3: Préférence personnalisée */}
            <button
              onClick={() => setMode('custom_preference')}
              className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-200 hover:border-brand-300 hover:shadow-soft transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <PenLine className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-700">Expliquer ce que vous préférez</p>
                <p className="text-xs text-ink-400">{agentName} s&apos;en souviendra pour la prochaine fois</p>
              </div>
            </button>
          </div>
        )}

        {/* Mode: Préférence personnalisée */}
        {mode === 'custom_preference' && (
          <div className="space-y-3">
            <p className="text-xs text-ink-400">
              Décrivez ce que vous aimeriez que {agentName} fasse différemment à l&apos;avenir :
            </p>
            <textarea
              value={customPreference}
              onChange={(e) => setCustomPreference(e.target.value)}
              placeholder={`Ex: "Je préfère un ton plus professionnel" ou "Toujours inclure le prix TTC dans les devis"`}
              className="input min-h-[80px] resize-y text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveCustomPreference}
                disabled={!customPreference.trim() || saving}
                className="btn-brand text-sm py-2 px-4 flex items-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Brain className="w-3.5 h-3.5" />
                )}
                Mémoriser
              </button>
              <button
                onClick={() => setMode('suggest')}
                className="btn-ghost text-sm py-2 px-4"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Mode: Édition du prompt */}
        {mode === 'edit_prompt' && (
          <div className="space-y-3">
            <p className="text-xs text-ink-400">
              Modifiez votre message et {agentName} réessaiera :
            </p>
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="input min-h-[80px] resize-y text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                disabled={!editedPrompt.trim()}
                className="btn-brand text-sm py-2 px-4 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Relancer
              </button>
              <button
                onClick={() => setMode('suggest')}
                className="btn-ghost text-sm py-2 px-4"
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   DÉTECTION D'INSATISFACTION
   ═══════════════════════════════════════════════════════════════ */

/**
 * Vérifie si un message utilisateur exprime une insatisfaction
 */
export function detectDissatisfaction(message: string): boolean {
  const lower = message.toLowerCase().trim()

  // Messages trop courts pour être une insatisfaction significative
  if (lower.length < 3) return false

  // Vérifier les patterns
  return DISSATISFACTION_PATTERNS.some(pattern => pattern.test(lower))
}

/**
 * Détecte la catégorie de l'insatisfaction pour proposer des suggestions pertinentes
 */
function detectCategory(message: string): string | null {
  const lower = message.toLowerCase()

  if (/\b(formel|informel|ton|style|tutoie|vouvoie|décontracté|professionnel)\b/.test(lower)) {
    return 'tone'
  }
  if (/\b(court|long|détaillé|concis|bref|résumé|complet|liste)\b/.test(lower)) {
    return 'format'
  }
  if (/\b(prix|ttc|ht|devis|facture|mention|légal|signature|rgpd|rge)\b/.test(lower)) {
    return 'content'
  }

  return 'tone' // Fallback: proposer des suggestions de ton par défaut
}
