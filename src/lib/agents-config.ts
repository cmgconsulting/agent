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
  promptSuggestions: string[]
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
    promptSuggestions: [
      'Cree un post LinkedIn pour montrer mon dernier chantier de panneaux solaires',
      'Redige une publication Facebook pour promouvoir notre offre PAC air-eau',
      'Genere une story Instagram pour montrer l\'avant/apres d\'une installation',
      'Prepare un post pour annoncer qu\'on recrute un technicien',
    ],
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
    promptSuggestions: [
      'Un client se plaint d\'un bruit anormal sur sa pompe a chaleur, aide-moi a repondre',
      'Redige un email pour informer un client que son intervention est reportee',
      'Un client demande comment regler la temperature de son poele a granules',
      'Prepare une reponse pour un avis negatif Google',
    ],
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
    promptSuggestions: [
      'Redige un email de relance pour un devis envoye il y a 10 jours',
      'Reponds a ce client qui demande un rendez-vous pour un diagnostic energetique',
      'Cree un email type pour confirmer une date d\'intervention',
      'Redige une newsletter mensuelle sur les aides MaPrimeRenov 2026',
    ],
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
    promptSuggestions: [
      'Genere un devis pour l\'installation d\'une PAC air-eau Atlantic 12kW',
      'Calcule les aides MaPrimeRenov pour un couple avec 35 000\u20AC de revenus',
      'Cree une facture pour le chantier de M. Dupont — panneaux solaires 6kWc',
      'Envoie une relance de paiement pour la facture F-2026-042',
    ],
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
    promptSuggestions: [
      'Cree une campagne Facebook Ads pour generer des leads pompe a chaleur',
      'Analyse mes leads du mois et dis-moi lesquels sont les plus chauds',
      'Redige une sequence de 3 emails pour convertir mes prospects panneaux solaires',
      'Propose-moi des idees de contenu pour le mois prochain',
    ],
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
    promptSuggestions: [
      'Cree une procedure pour l\'installation d\'un poele a granules etape par etape',
      'Documente le processus de prise en charge d\'un nouveau client',
      'Genere un organigramme pour mon entreprise de 8 personnes',
      'Redige une checklist qualite pour la mise en service d\'une PAC',
    ],
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
    promptSuggestions: [
      'Calcule ma marge sur une installation PAC air-eau a 14 000\u20AC HT',
      'Analyse ma tresorerie previsionnelle pour les 3 prochains mois',
      'Compare la rentabilite de mes chantiers PAC vs panneaux solaires',
      'Alerte-moi si un client a un impaye de plus de 30 jours',
    ],
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
    promptSuggestions: [
      'Genere un rapport mensuel de l\'activite de mes agents',
      'Quel est mon ROI estime ce mois-ci grace aux agents ?',
      'Compare mes performances de ce trimestre vs le precedent',
      'Quels sont mes KPIs les plus importants a suivre ?',
    ],
  },
]

export const PLAN_AGENTS_LIMIT: Record<PlanType, number> = {
  starter: 3,
  pro: 8,
  enterprise: -1, // illimite
}

export const PLAN_LABELS: Record<PlanType, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export function getAgentConfig(type: AgentType): AgentConfig {
  return AGENTS.find(a => a.type === type)!
}
