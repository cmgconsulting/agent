/**
 * Lead Pipeline & Qualification for Hugo
 * Lead scoring, SMS auto-response, and nurture sequence management
 */

export interface Lead {
  id?: string
  name: string
  email?: string
  phone: string
  source: 'meta_ads' | 'google_ads' | 'website' | 'referral' | 'manual'
  project_type?: string // pompe_a_chaleur, panneaux_solaires, etc.
  postal_code?: string
  revenue_category?: string
  housing_type?: string
  housing_age?: number
  message?: string
  created_at: string
  score?: number
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost'
  notes?: string
}

export interface LeadScore {
  total: number // 0-100
  breakdown: {
    source: number
    completeness: number
    project_fit: number
    urgency: number
    location: number
  }
  qualification: 'hot' | 'warm' | 'cold'
  recommended_action: string
}

export interface NurtureSequence {
  id: string
  name: string
  target: 'cold' | 'warm' | 'all'
  steps: NurtureStep[]
}

export interface NurtureStep {
  day: number // days after enrollment
  channel: 'email' | 'sms'
  subject?: string
  template: string
  variables: string[] // placeholders like {name}, {project_type}
}

// ===== Lead Scoring =====

export function scoreLead(lead: Lead): LeadScore {
  let sourceScore = 0
  let completenessScore = 0
  let projectFitScore = 0
  let urgencyScore = 0
  let locationScore = 0

  // Source quality (0-20)
  const sourceScores: Record<string, number> = {
    meta_ads: 15,
    google_ads: 18, // Higher intent from search
    website: 14,
    referral: 20,
    manual: 10,
  }
  sourceScore = sourceScores[lead.source] || 10

  // Data completeness (0-20)
  if (lead.name) completenessScore += 4
  if (lead.email) completenessScore += 4
  if (lead.phone) completenessScore += 4
  if (lead.project_type) completenessScore += 4
  if (lead.postal_code) completenessScore += 2
  if (lead.message) completenessScore += 2

  // Project fit for ENR (0-25)
  const highValueProjects = ['pompe_a_chaleur', 'panneaux_solaires']
  const mediumValueProjects = ['poele_a_granules', 'isolation']
  if (lead.project_type) {
    if (highValueProjects.includes(lead.project_type)) projectFitScore = 25
    else if (mediumValueProjects.includes(lead.project_type)) projectFitScore = 18
    else projectFitScore = 12
  }

  // Revenue category bonus (eligible for aids = more likely to convert)
  if (lead.revenue_category === 'tres_modeste' || lead.revenue_category === 'modeste') {
    projectFitScore = Math.min(25, projectFitScore + 5)
  }

  // Housing fit
  if (lead.housing_age && lead.housing_age >= 15) {
    projectFitScore = Math.min(25, projectFitScore + 3)
  }

  // Urgency signals (0-15)
  if (lead.message) {
    const urgentKeywords = ['urgent', 'rapidement', 'panne', 'en panne', 'vite', 'des que possible', 'hiver', 'froid']
    const hasUrgency = urgentKeywords.some(kw => lead.message!.toLowerCase().includes(kw))
    if (hasUrgency) urgencyScore = 15
    else urgencyScore = 5
  }

  // Freshness: new leads score higher
  const ageHours = (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60)
  if (ageHours < 1) urgencyScore = Math.min(15, urgencyScore + 10)
  else if (ageHours < 24) urgencyScore = Math.min(15, urgencyScore + 5)

  // Location (0-20) — proximity to service area
  // Simplified: valid French postal code = eligible
  if (lead.postal_code) {
    const isValidFR = /^(0[1-9]|[1-8]\d|9[0-5])\d{3}$/.test(lead.postal_code)
    locationScore = isValidFR ? 20 : 5
  }

  const total = Math.min(100, sourceScore + completenessScore + projectFitScore + urgencyScore + locationScore)

  let qualification: 'hot' | 'warm' | 'cold'
  let recommendedAction: string

  if (total >= 70) {
    qualification = 'hot'
    recommendedAction = 'Appeler dans les 2 heures. Lead chaud, forte probabilite de conversion.'
  } else if (total >= 40) {
    qualification = 'warm'
    recommendedAction = 'Envoyer un email personnalise + SMS. Planifier un rappel sous 24h.'
  } else {
    qualification = 'cold'
    recommendedAction = 'Inscrire dans la sequence de nurturing. Relancer dans 7 jours.'
  }

  return {
    total,
    breakdown: {
      source: sourceScore,
      completeness: completenessScore,
      project_fit: projectFitScore,
      urgency: urgencyScore,
      location: locationScore,
    },
    qualification,
    recommended_action: recommendedAction,
  }
}

// ===== Auto-Response SMS (< 2min target) =====

export function generateAutoResponseSMS(lead: Lead, companyName: string): string {
  const projectLabels: Record<string, string> = {
    pompe_a_chaleur: 'pompe a chaleur',
    panneaux_solaires: 'panneaux solaires',
    poele_a_bois: 'poele a bois',
    poele_a_granules: 'poele a granules',
    isolation: 'isolation',
  }

  const projectLabel = lead.project_type ? projectLabels[lead.project_type] || lead.project_type : 'projet'
  const firstName = lead.name.split(' ')[0]

  return `${companyName}: Bonjour ${firstName}, merci pour votre demande concernant votre ${projectLabel}. Un conseiller vous rappellera tres rapidement. A bientot !`
}

// ===== Nurture Sequences =====

export const DEFAULT_NURTURE_SEQUENCES: NurtureSequence[] = [
  {
    id: 'cold_enr',
    name: 'Nurturing ENR - Leads froids',
    target: 'cold',
    steps: [
      {
        day: 0,
        channel: 'email',
        subject: '{company} - Votre projet {project_type}',
        template: `Bonjour {name},

Merci de l'interet que vous portez a nos solutions {project_type}.

Saviez-vous que vous pouvez beneficier d'aides allant jusqu'a 10 000 EUR pour votre projet ? MaPrimeRenov et la prime CEE peuvent couvrir une grande partie de votre investissement.

Nous serions ravis d'echanger avec vous pour etudier votre eligibilite.

Cordialement,
{company}`,
        variables: ['name', 'project_type', 'company'],
      },
      {
        day: 3,
        channel: 'sms',
        template: '{company}: {name}, avez-vous eu le temps de consulter notre email sur les aides pour votre {project_type} ? N\'hesitez pas a nous appeler au {phone}.',
        variables: ['name', 'project_type', 'company', 'phone'],
      },
      {
        day: 7,
        channel: 'email',
        subject: 'Etude de cas - Installation {project_type} dans votre region',
        template: `Bonjour {name},

Nous avons recemment realise une installation de {project_type} a proximite de chez vous ({postal_code}).

Le client a beneficie de {aid_amount} EUR d'aides, reduisant son investissement de plus de 50%.

Souhaitez-vous une etude personnalisee gratuite ?

Cordialement,
{company}`,
        variables: ['name', 'project_type', 'postal_code', 'aid_amount', 'company'],
      },
      {
        day: 14,
        channel: 'email',
        subject: 'Derniere chance - Offre speciale {project_type}',
        template: `Bonjour {name},

Les aides gouvernementales pour les projets {project_type} evoluent regulierement. Pour profiter des montants actuels, nous vous recommandons de lancer votre projet rapidement.

Nous proposons une visite technique gratuite et sans engagement pour evaluer votre projet.

Prenez rendez-vous directement en repondant a cet email.

Cordialement,
{company}`,
        variables: ['name', 'project_type', 'company'],
      },
    ],
  },
  {
    id: 'warm_enr',
    name: 'Nurturing ENR - Leads tiedes',
    target: 'warm',
    steps: [
      {
        day: 0,
        channel: 'email',
        subject: 'Votre estimation personnalisee - {project_type}',
        template: `Bonjour {name},

Suite a votre demande, voici une premiere estimation pour votre projet {project_type} :

- Estimation aides MaPrimeRenov : {maprimenov} EUR
- Estimation prime CEE : {cee} EUR
- Reste a charge estime : a partir de {reste_charge} EUR

Pour affiner cette estimation, nous proposons une visite technique gratuite a votre domicile.

Quand seriez-vous disponible ?

Cordialement,
{company}`,
        variables: ['name', 'project_type', 'maprimenov', 'cee', 'reste_charge', 'company'],
      },
      {
        day: 2,
        channel: 'sms',
        template: '{company}: {name}, avez-vous pu consulter notre estimation pour votre {project_type} ? Rappel: visite technique gratuite. Appelez-nous au {phone}.',
        variables: ['name', 'project_type', 'company', 'phone'],
      },
      {
        day: 5,
        channel: 'email',
        subject: 'Temoignage client - {project_type}',
        template: `Bonjour {name},

"Depuis l'installation de notre {project_type}, nous avons reduit notre facture energetique de 40%. L'equipe de {company} nous a accompagne de A a Z." - Client satisfait

Nous pouvons faire la meme chose pour vous. Repondez a cet email pour planifier votre visite technique.

Cordialement,
{company}`,
        variables: ['name', 'project_type', 'company'],
      },
    ],
  },
]

export function getNurtureSequence(qualification: 'hot' | 'warm' | 'cold'): NurtureSequence | null {
  if (qualification === 'hot') return null // Hot leads go to direct contact
  return DEFAULT_NURTURE_SEQUENCES.find(s => s.target === qualification) || DEFAULT_NURTURE_SEQUENCES[0]
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
