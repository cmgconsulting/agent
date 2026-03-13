import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AgentType, CompanyMemory, OnboardingProduct, SavScript } from '@/types/database'

// ============================================
// Build system prompt from company_memory
// ============================================

function formatProducts(products: OnboardingProduct[]): string {
  if (!products.length) return 'Catalogue non renseigne'
  return products.map(p =>
    `- ${p.name} (${p.brand}) : ${p.price_range} — ${p.description}`
  ).join('\n')
}

function formatSavScripts(scripts: SavScript[]): string {
  if (!scripts.length) return 'Aucun script SAV defini'
  return scripts.map(s =>
    `- Situation : "${s.trigger}" → Reponse : "${s.response}"`
  ).join('\n')
}

const AGENT_SPECIFIC_RULES: Record<AgentType, string> = {
  eva: `REGLES SPECIFIQUES EVA :
- Tu proposes un calendrier editorial adapte au secteur ENR (saisons de chauffe, periodes de subventions)
- Avant de publier un post, tu demandes TOUJOURS la validation du contenu
- Tu adaptes le format au reseau (carres Instagram, paysage Facebook)
- Tu utilises les hashtags ENR pertinents (#poeleabois #pompeachaleur #MaPrimeRenov)`,

  ludo: `REGLES SPECIFIQUES LUDO :
- Tu utilises les scripts SAV definis pour repondre aux demandes courantes
- Tu crees un ticket dans Airtable pour chaque demande client
- Tu escalades vers le patron pour : reclamations financieres, urgences techniques, demandes juridiques
- Tu ne promets jamais de delai sans verifier le planning`,

  marc: `REGLES SPECIFIQUES MARC :
- Tu tries les emails par priorite : urgent / a traiter / info
- Tu utilises la signature email du client pour chaque envoi
- Tu ne reponds jamais aux emails sensibles (juridique, financier) sans validation
- Tu prepares les brouillons et demandes validation avant envoi`,

  leo: `REGLES SPECIFIQUES LEO :
- Tu generes les devis en respectant les marges cibles definies
- Tu integres automatiquement les aides (MaPrimeRenov, CEE, TVA reduite)
- Tu ne valides jamais un devis a un prix inferieur a la marge cible sans approbation
- Tu suis les factures impayees selon le processus de relance defini`,

  hugo: `REGLES SPECIFIQUES HUGO :
- Tu cibles les profils clients typiques definis dans la memoire entreprise
- Tu mets en avant les differenciateurs par rapport a la concurrence
- Tu geres le budget pub selon les objectifs fixes
- Tu ne depasses jamais le budget quotidien sans validation`,

  sofia: `REGLES SPECIFIQUES SOFIA :
- Tu documentes chaque processus metier de maniere claire et structuree
- Tu crees des checklists operationnelles pour les techniciens
- Tu standardises les procedures de pose et d'intervention
- Tu proposes des ameliorations basees sur les retours terrain`,

  felix: `REGLES SPECIFIQUES FELIX :
- Tu respectes les marges cibles par produit definies dans la memoire
- Tu alertes si une facture depasse 30 jours de retard
- Tu generes les rapports financiers hebdomadaires
- Tu ne valides aucune depense hors budget sans approbation`,

  iris: `REGLES SPECIFIQUES IRIS :
- Tu consolides les KPIs de tous les agents dans des tableaux clairs
- Tu identifies les tendances et anomalies dans les donnees
- Tu generes un rapport hebdomadaire synthetique
- Tu alertes sur les indicateurs en dessous des seuils definis`,
}

export function buildAgentSystemPrompt(
  agentType: AgentType,
  agentName: string,
  agentRole: string,
  companyName: string,
  memory: CompanyMemory
): string {
  const sections: string[] = []

  // Header
  sections.push(`Tu es ${agentName}, l'agent ${agentRole} de ${companyName}.`)

  // Identite
  if (memory.company_description) {
    sections.push(`IDENTITE DE L'ENTREPRISE :
${memory.company_description}
Zone d'intervention : ${memory.geographic_zone || 'Non renseignee'}
Certifications : ${memory.certifications.length ? memory.certifications.join(', ') : 'Aucune'}
Equipe : ${memory.team_size || '?'} personnes
${memory.brand_values.length ? `Valeurs : ${memory.brand_values.join(', ')}` : ''}`)
  }

  // Catalogue
  if (memory.products.length) {
    sections.push(`CATALOGUE PRODUITS :
${formatProducts(memory.products)}
Delais d'intervention : ${memory.intervention_delays || 'Non renseigne'}
Aides disponibles : ${memory.available_subsidies.length ? memory.available_subsidies.join(', ') : 'Non renseignees'}`)
  }

  // Commercial
  if (memory.typical_client_profile || memory.differentiators.length) {
    const commercialParts: string[] = ['CONTEXTE COMMERCIAL :']
    if (memory.typical_client_profile) commercialParts.push(`Client typique : ${memory.typical_client_profile}`)
    if (memory.average_ticket) commercialParts.push(`Ticket moyen : ${memory.average_ticket}€`)
    if (memory.differentiators.length) commercialParts.push(`Nos atouts : ${memory.differentiators.join(', ')}`)
    if (memory.competitors.length) commercialParts.push(`Concurrents locaux : ${memory.competitors.join(', ')}`)
    sections.push(commercialParts.join('\n'))
  }

  // Ton de communication
  sections.push(`TON DE COMMUNICATION :
- Style : ${memory.tone_of_voice || 'professionnel'}
- ${memory.formal_address ? 'Vouvoiement obligatoire' : 'Tutoiement autorise'}
${memory.words_to_avoid.length ? `- Mots a eviter : ${memory.words_to_avoid.join(', ')}` : ''}
${memory.email_signature ? `- Signature email : ${memory.email_signature}` : ''}`)

  // SAV
  if (memory.sav_scripts.length) {
    sections.push(`SCRIPTS SAV :
${formatSavScripts(memory.sav_scripts)}
Contact urgence : ${memory.emergency_contact || 'Non renseigne'}
Delai de reponse promis : ${memory.response_delay || 'Non renseigne'}`)
  }

  // Finance
  if (memory.target_margin || memory.hourly_rate) {
    const financeParts: string[] = ['PARAMETRES FINANCIERS :']
    if (memory.target_margin) financeParts.push(`Marge cible : ${memory.target_margin}%`)
    if (memory.hourly_rate) financeParts.push(`Taux horaire : ${memory.hourly_rate}€`)
    sections.push(financeParts.join('\n'))
  }

  // Regles absolues
  sections.push(`TES REGLES ABSOLUES :
1. Tu representes ${companyName} — jamais CMG ni aucune autre entite
2. Tu ne promets jamais de prix sans verification dans le catalogue
3. Tu reponds en francais, de maniere ${memory.tone_of_voice || 'professionnelle'}
4. Tu log chaque action dans le systeme
5. Pour les actions importantes, tu demandes TOUJOURS validation

${AGENT_SPECIFIC_RULES[agentType]}`)

  return sections.join('\n\n')
}

// ============================================
// Regenerate all agent prompts for a client
// ============================================

export async function regenerateAgentPrompts(clientId: string): Promise<number> {
  const supabase = createServiceRoleClient()

  // Load company memory
  const { data: memory } = await supabase
    .from('company_memory')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (!memory) return 0

  // Load client for company name
  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  if (!client) return 0

  // Load active agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('client_id', clientId)
    .eq('active', true)

  if (!agents || !agents.length) return 0

  // Agent name/role mapping
  const AGENT_META: Record<string, { name: string; role: string }> = {
    eva: { name: 'Eva', role: 'responsable reseaux sociaux' },
    ludo: { name: 'Ludo', role: 'responsable SAV Client' },
    marc: { name: 'Marc', role: 'responsable emails' },
    leo: { name: 'Leo', role: 'responsable devis & factures' },
    hugo: { name: 'Hugo', role: 'responsable marketing & leads' },
    sofia: { name: 'Sofia', role: 'responsable structuration & SOP' },
    felix: { name: 'Felix', role: 'responsable finance' },
    iris: { name: 'Iris', role: 'responsable data & reporting' },
  }

  let updated = 0
  for (const agent of agents) {
    const meta = AGENT_META[agent.type]
    if (!meta) continue

    const prompt = buildAgentSystemPrompt(
      agent.type as AgentType,
      meta.name,
      meta.role,
      client.company_name,
      memory as unknown as CompanyMemory
    )

    await supabase
      .from('agents')
      .update({ system_prompt: prompt })
      .eq('id', agent.id)

    updated++
  }

  return updated
}

// ============================================
// Calculate onboarding score
// ============================================

export function calculateOnboardingScore(memory: CompanyMemory): number {
  let filledSteps = 0

  // Etape 1 — Identite (company_description + geographic_zone minimum)
  if (memory.company_description && memory.geographic_zone) filledSteps++

  // Etape 2 — Catalogue (products non vide)
  if (memory.products.length > 0) filledSteps++

  // Etape 3 — Commercial (typical_client_profile)
  if (memory.typical_client_profile) filledSteps++

  // Etape 4 — Communication (tone_of_voice renseigne)
  if (memory.tone_of_voice) filledSteps++

  // Etape 5 — SAV (sav_scripts non vide ou emergency_contact)
  if (memory.sav_scripts.length > 0 || memory.emergency_contact) filledSteps++

  return Math.round((filledSteps / 5) * 100)
}
