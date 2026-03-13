/**
 * MaPrimeRénov & CEE Aid Calculator for Leo
 * Calculates available government aids for ENR projects
 * Based on 2024-2025 French regulations
 */

export type ProjectType = 'pompe_a_chaleur' | 'panneaux_solaires' | 'poele_a_bois' | 'poele_a_granules' | 'isolation' | 'chauffe_eau_solaire' | 'chauffe_eau_thermo'
export type RevenueCategory = 'tres_modeste' | 'modeste' | 'intermediaire' | 'superieur'

export interface AidCalculationInput {
  project_type: ProjectType
  revenue_category: RevenueCategory
  location: string // code postal
  housing_type: 'maison' | 'appartement'
  housing_age: number // years
  surface?: number // m²
  project_cost?: number // cost HT for CEE calculation
}

export interface AidResult {
  maprimenov: {
    eligible: boolean
    amount: number
    details: string
  }
  cee: {
    eligible: boolean
    amount: number
    details: string
  }
  tva_reduite: {
    applicable: boolean
    rate: number
    details: string
  }
  eco_ptz: {
    eligible: boolean
    max_amount: number
    details: string
  }
  total_aids: number
  summary: string
}

// MaPrimeRénov amounts by project type and revenue category
// Source: barèmes officiels 2024 (simplifiés)
const MAPRIMENOV_AMOUNTS: Record<ProjectType, Record<RevenueCategory, number>> = {
  pompe_a_chaleur: {
    tres_modeste: 5000,
    modeste: 4000,
    intermediaire: 3000,
    superieur: 0,
  },
  panneaux_solaires: {
    tres_modeste: 4000,
    modeste: 3000,
    intermediaire: 2000,
    superieur: 0,
  },
  poele_a_bois: {
    tres_modeste: 2500,
    modeste: 2000,
    intermediaire: 1000,
    superieur: 0,
  },
  poele_a_granules: {
    tres_modeste: 2500,
    modeste: 2000,
    intermediaire: 1500,
    superieur: 0,
  },
  isolation: {
    tres_modeste: 75, // per m²
    modeste: 60,
    intermediaire: 40,
    superieur: 15,
  },
  chauffe_eau_solaire: {
    tres_modeste: 4000,
    modeste: 3000,
    intermediaire: 2000,
    superieur: 0,
  },
  chauffe_eau_thermo: {
    tres_modeste: 1200,
    modeste: 800,
    intermediaire: 400,
    superieur: 0,
  },
}

// CEE prime estimates (in EUR) — simplified flat amounts
const CEE_AMOUNTS: Record<ProjectType, number> = {
  pompe_a_chaleur: 4000,
  panneaux_solaires: 0, // Not eligible for CEE
  poele_a_bois: 800,
  poele_a_granules: 1000,
  isolation: 12, // per m²
  chauffe_eau_solaire: 150,
  chauffe_eau_thermo: 150,
}

// Revenue thresholds (Île-de-France vs Province, per number of persons in household)
// Simplified: we use "IDF" if postal code starts with 75, 77, 78, 91, 92, 93, 94, 95
const IDF_PREFIXES = ['75', '77', '78', '91', '92', '93', '94', '95']

function isIDF(postalCode: string): boolean {
  const prefix = postalCode.substring(0, 2)
  return IDF_PREFIXES.includes(prefix)
}

// Revenue category labels
const REVENUE_LABELS: Record<RevenueCategory, string> = {
  tres_modeste: 'Tres modestes',
  modeste: 'Modestes',
  intermediaire: 'Intermediaires',
  superieur: 'Superieurs',
}

const PROJECT_LABELS: Record<ProjectType, string> = {
  pompe_a_chaleur: 'Pompe a chaleur (air/eau ou geothermie)',
  panneaux_solaires: 'Panneaux solaires photovoltaiques',
  poele_a_bois: 'Poele a bois buches',
  poele_a_granules: 'Poele a granules',
  isolation: 'Isolation thermique',
  chauffe_eau_solaire: 'Chauffe-eau solaire individuel',
  chauffe_eau_thermo: 'Chauffe-eau thermodynamique',
}

export function calculateAids(input: AidCalculationInput): AidResult {
  const idf = isIDF(input.location)
  const isIsolation = input.project_type === 'isolation'

  // MaPrimeRénov
  let maprimenovAmount = MAPRIMENOV_AMOUNTS[input.project_type]?.[input.revenue_category] || 0
  if (isIsolation && input.surface) {
    maprimenovAmount = maprimenovAmount * input.surface // per m² rate
  }
  const maprimenovEligible = maprimenovAmount > 0 && input.housing_age >= 15

  // CEE
  let ceeAmount = CEE_AMOUNTS[input.project_type] || 0
  if (isIsolation && input.surface) {
    ceeAmount = ceeAmount * input.surface
  }
  // CEE bonus for modest/very modest revenues
  if (input.revenue_category === 'tres_modeste' || input.revenue_category === 'modeste') {
    ceeAmount = Math.round(ceeAmount * 1.5) // Bonus "coup de pouce"
  }
  const ceeEligible = ceeAmount > 0

  // TVA réduite
  const tvaReduiteApplicable = input.housing_age >= 2
  let tvaRate = 20
  if (tvaReduiteApplicable) {
    // 5.5% for energy renovation, 10% for other improvement works
    if (['pompe_a_chaleur', 'poele_a_bois', 'poele_a_granules', 'isolation', 'chauffe_eau_solaire', 'chauffe_eau_thermo'].includes(input.project_type)) {
      tvaRate = 5.5
    } else {
      tvaRate = 10
    }
  }

  // Éco-PTZ
  const ecoPtzEligible = input.housing_age >= 2
  let ecoPtzMax = 15000 // single action
  if (input.project_type === 'isolation' && input.surface && input.surface > 50) {
    ecoPtzMax = 25000 // bouquet of works
  }

  const totalAids = (maprimenovEligible ? maprimenovAmount : 0) + (ceeEligible ? ceeAmount : 0)

  const summaryParts: string[] = [
    `Projet : ${PROJECT_LABELS[input.project_type]}`,
    `Revenus : ${REVENUE_LABELS[input.revenue_category]}`,
    `Zone : ${idf ? 'Ile-de-France' : 'Province'} (${input.location})`,
    `Logement : ${input.housing_type}, ${input.housing_age} ans`,
    '',
    `--- AIDES ESTIMEES ---`,
  ]

  if (maprimenovEligible) {
    summaryParts.push(`MaPrimeRenov : ${maprimenovAmount} EUR`)
  } else {
    summaryParts.push(`MaPrimeRenov : Non eligible${input.housing_age < 15 ? ' (logement < 15 ans)' : input.revenue_category === 'superieur' ? ' (revenus superieurs)' : ''}`)
  }

  if (ceeEligible) {
    summaryParts.push(`Prime CEE : ${ceeAmount} EUR${input.revenue_category === 'tres_modeste' || input.revenue_category === 'modeste' ? ' (bonus modeste)' : ''}`)
  } else {
    summaryParts.push(`Prime CEE : Non applicable pour ce type de projet`)
  }

  summaryParts.push(`TVA : ${tvaRate}%${tvaReduiteApplicable ? ' (taux reduit)' : ' (taux normal)'}`)
  summaryParts.push(`Eco-PTZ : ${ecoPtzEligible ? `Eligible (max ${ecoPtzMax} EUR)` : 'Non eligible (logement < 2 ans)'}`)
  summaryParts.push(``)
  summaryParts.push(`TOTAL AIDES ESTIMEES : ${totalAids} EUR`)

  if (input.project_cost) {
    const resteACharge = Math.max(0, input.project_cost - totalAids)
    summaryParts.push(`Cout projet HT : ${input.project_cost} EUR`)
    summaryParts.push(`Reste a charge estime : ${resteACharge} EUR`)
  }

  return {
    maprimenov: {
      eligible: maprimenovEligible,
      amount: maprimenovEligible ? maprimenovAmount : 0,
      details: maprimenovEligible
        ? `MaPrimeRenov ${REVENUE_LABELS[input.revenue_category]} : ${maprimenovAmount} EUR${isIsolation ? ` (${MAPRIMENOV_AMOUNTS[input.project_type][input.revenue_category]} EUR/m²)` : ''}`
        : `Non eligible : ${input.housing_age < 15 ? 'logement de moins de 15 ans' : 'revenus superieurs au plafond'}`,
    },
    cee: {
      eligible: ceeEligible,
      amount: ceeEligible ? ceeAmount : 0,
      details: ceeEligible
        ? `Prime CEE estimee : ${ceeAmount} EUR`
        : 'Non applicable pour ce type de projet',
    },
    tva_reduite: {
      applicable: tvaReduiteApplicable,
      rate: tvaRate,
      details: tvaReduiteApplicable
        ? `TVA a ${tvaRate}% applicable (logement > 2 ans)`
        : 'TVA a 20% (logement < 2 ans)',
    },
    eco_ptz: {
      eligible: ecoPtzEligible,
      max_amount: ecoPtzEligible ? ecoPtzMax : 0,
      details: ecoPtzEligible
        ? `Eco-PTZ eligible : pret sans interet jusqu'a ${ecoPtzMax} EUR`
        : 'Non eligible (logement < 2 ans)',
    },
    total_aids: totalAids,
    summary: summaryParts.join('\n'),
  }
}
