import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AgentType } from '@/types/database'

/**
 * Récupère et formate les préférences d'un client pour un agent donné.
 * Le résultat est une chaîne à injecter dans le prompt système de l'agent.
 *
 * Architecture :
 * 1. Préférences globales (applicables à tous les agents)
 * 2. Préférences spécifiques à l'agent
 * 3. Prompt personnalisé (mode avancé) si défini
 */
export async function getClientPreferencesForPrompt(
  clientId: string,
  agentType: AgentType
): Promise<string> {
  const supabase = createServerSupabaseClient()

  // 1. Récupérer les préférences actives (globales + spécifiques agent)
  const { data: preferences } = await supabase
    .from('client_preferences')
    .select('preference_value, agent_type')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .or(`agent_type.eq.global,agent_type.eq.${agentType}`)
    .order('created_at', { ascending: true })

  // 2. Récupérer le prompt personnalisé (mode avancé)
  const { data: customPrompt } = await supabase
    .from('client_agent_prompts')
    .select('custom_prompt, replace_default')
    .eq('client_id', clientId)
    .eq('agent_type', agentType)
    .single()

  // Construire le bloc de préférences
  const parts: string[] = []

  if (preferences && preferences.length > 0) {
    const globalPrefs = preferences.filter(p => p.agent_type === 'global')
    const agentPrefs = preferences.filter(p => p.agent_type === agentType)

    if (globalPrefs.length > 0 || agentPrefs.length > 0) {
      parts.push('\n--- PRÉFÉRENCES DU CLIENT ---')

      if (globalPrefs.length > 0) {
        parts.push('Règles générales :')
        globalPrefs.forEach(p => parts.push(`- ${p.preference_value}`))
      }

      if (agentPrefs.length > 0) {
        parts.push(`\nRègles spécifiques pour cet agent :`)
        agentPrefs.forEach(p => parts.push(`- ${p.preference_value}`))
      }

      parts.push('--- FIN DES PRÉFÉRENCES ---\n')
    }
  }

  // 3. Ajouter le prompt personnalisé (mode avancé)
  if (customPrompt?.custom_prompt?.trim()) {
    if (customPrompt.replace_default) {
      // Mode remplacement (rare) — le prompt custom remplace tout
      return customPrompt.custom_prompt
    }

    parts.push('\n--- INSTRUCTIONS PERSONNALISÉES ---')
    parts.push(customPrompt.custom_prompt)
    parts.push('--- FIN DES INSTRUCTIONS ---\n')
  }

  return parts.join('\n')
}

/**
 * Vérifie si un client a des préférences définies (pour affichage conditionnel)
 */
export async function hasClientPreferences(
  clientId: string,
  agentType?: AgentType
): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('client_preferences')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('is_active', true)

  if (agentType) {
    query = query.or(`agent_type.eq.global,agent_type.eq.${agentType}`)
  }

  const { count } = await query
  return (count || 0) > 0
}
