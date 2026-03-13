import type { AgentType, PlanType } from '@/types/database'

export interface AgentConfig {
  type: AgentType
  name: string
  role: string
  description: string
  category: 'communication' | 'strategie'
  color: string
  icon: string // emoji
  connectors: string[]
}

export const AGENTS: AgentConfig[] = [
  {
    type: 'eva',
    name: 'Eva',
    role: 'Reseaux sociaux',
    description: 'Genere et publie les posts, repond aux commentaires, analyse les performances.',
    category: 'communication',
    color: '#E91E63',
    icon: '📱',
    connectors: ['meta_api', 'linkedin_api', 'canva'],
  },
  {
    type: 'ludo',
    name: 'Ludo',
    role: 'SAV Client',
    description: 'Repond aux demandes clients, cree les tickets SAV, escalade les cas complexes.',
    category: 'communication',
    color: '#2196F3',
    icon: '🎧',
    connectors: ['whatsapp', 'twilio', 'airtable', 'gmail'],
  },
  {
    type: 'marc',
    name: 'Marc',
    role: 'Emails',
    description: 'Trie la boite mail, repond aux demandes de devis, envoie les newsletters.',
    category: 'communication',
    color: '#FF9800',
    icon: '📧',
    connectors: ['gmail', 'outlook', 'brevo', 'mailchimp'],
  },
  {
    type: 'leo',
    name: 'Leo',
    role: 'Operationnel',
    description: 'Genere les devis, calcule les aides, envoie les factures, relance les impayes.',
    category: 'communication',
    color: '#4CAF50',
    icon: '📋',
    connectors: ['pennylane', 'sellsy', 'quickbooks', 'google_docs'],
  },
  {
    type: 'hugo',
    name: 'Hugo',
    role: 'Marketing & Acquisition',
    description: 'Gere les campagnes pub, qualifie les leads, nourrit les prospects.',
    category: 'communication',
    color: '#9C27B0',
    icon: '🎯',
    connectors: ['meta_ads', 'google_ads', 'twilio', 'airtable'],
  },
  {
    type: 'sofia',
    name: 'Sofia',
    role: 'Structuration & SOP',
    description: 'Genere l\'organigramme, redige les SOP, detecte les gaps de process.',
    category: 'strategie',
    color: '#009688',
    icon: '🏗️',
    connectors: ['notion', 'google_docs', 'airtable'],
  },
  {
    type: 'felix',
    name: 'Felix',
    role: 'Finance & Marges',
    description: 'Calcule les marges, alerte sur les seuils, produit la tresorerie previsionnelle.',
    category: 'strategie',
    color: '#FF5722',
    icon: '💰',
    connectors: ['pennylane', 'quickbooks', 'google_sheets', 'sellsy'],
  },
  {
    type: 'iris',
    name: 'Iris',
    role: 'Data & Reporting',
    description: 'Consolide les KPIs, genere les rapports PDF, analyse le ROI par canal.',
    category: 'strategie',
    color: '#3F51B5',
    icon: '📊',
    connectors: ['google_analytics', 'pennylane', 'airtable'],
  },
]

export const PLAN_AGENTS_LIMIT: Record<PlanType, number> = {
  basic: 3,
  pro: 6,
  full: 8,
}

export const PLAN_LABELS: Record<PlanType, string> = {
  basic: 'Basic',
  pro: 'Pro',
  full: 'Full',
}

export function getAgentConfig(type: AgentType): AgentConfig {
  return AGENTS.find(a => a.type === type)!
}
