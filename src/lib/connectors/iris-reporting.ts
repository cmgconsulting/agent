/**
 * Iris — Reporting & KPI Consolidation
 * Weekly dashboard, PDF reports, ROI analysis per acquisition channel
 */

// ============================================
// TYPES
// ============================================

export interface KPISource {
  source: string          // 'ads', 'email', 'sav', 'finance', 'leads'
  metrics: Record<string, number | string>
  period: string          // 'week', 'month', 'custom'
  date_range: { start: string; end: string }
}

export interface ConsolidatedKPIs {
  period: string
  date_range: { start: string; end: string }
  generated_at: string
  commercial: {
    leads_total: number
    leads_qualified: number
    devis_envoyes: number
    devis_signes: number
    taux_conversion: number       // %
    ca_signe: number
    panier_moyen: number
  }
  marketing: {
    ad_spend: number
    impressions: number
    clicks: number
    ctr: number                    // %
    cpc: number
    leads_from_ads: number
    cost_per_lead: number
  }
  operations: {
    chantiers_en_cours: number
    chantiers_termines: number
    delai_moyen_jours: number
    factures_emises: number
    factures_payees: number
    taux_recouvrement: number     // %
    impayees: number
  }
  satisfaction: {
    tickets_sav: number
    tickets_resolus: number
    delai_moyen_resolution_h: number
    taux_resolution: number       // %
    nps_score?: number
  }
  finance: {
    ca_ht: number
    marge_brute: number
    marge_percent: number         // %
    tresorerie: number
    charges_fixes: number
  }
}

export interface ChannelROI {
  channel: string                 // 'meta_ads', 'google_ads', 'referral', 'website', 'manual'
  spend: number
  leads_generated: number
  leads_converted: number
  revenue_generated: number
  cost_per_lead: number
  cost_per_acquisition: number
  roi_percent: number             // %
  conversion_rate: number         // %
}

export interface WeeklyReport {
  title: string
  period: string
  date_range: { start: string; end: string }
  kpis: ConsolidatedKPIs
  roi_by_channel: ChannelROI[]
  highlights: string[]
  alerts: string[]
  recommendations: string[]
  html: string
}

// ============================================
// KPI CONSOLIDATION
// ============================================

export function consolidateKPIs(sources: KPISource[]): ConsolidatedKPIs {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  // Initialize with defaults
  const kpis: ConsolidatedKPIs = {
    period: 'week',
    date_range: {
      start: weekAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    generated_at: now.toISOString(),
    commercial: {
      leads_total: 0, leads_qualified: 0, devis_envoyes: 0, devis_signes: 0,
      taux_conversion: 0, ca_signe: 0, panier_moyen: 0,
    },
    marketing: {
      ad_spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0,
      leads_from_ads: 0, cost_per_lead: 0,
    },
    operations: {
      chantiers_en_cours: 0, chantiers_termines: 0, delai_moyen_jours: 0,
      factures_emises: 0, factures_payees: 0, taux_recouvrement: 0, impayees: 0,
    },
    satisfaction: {
      tickets_sav: 0, tickets_resolus: 0, delai_moyen_resolution_h: 0, taux_resolution: 0,
    },
    finance: {
      ca_ht: 0, marge_brute: 0, marge_percent: 0, tresorerie: 0, charges_fixes: 0,
    },
  }

  // Merge sources
  for (const src of sources) {
    const m = src.metrics
    switch (src.source) {
      case 'leads':
        kpis.commercial.leads_total += (m.total as number) || 0
        kpis.commercial.leads_qualified += (m.qualified as number) || 0
        kpis.commercial.devis_envoyes += (m.devis_sent as number) || 0
        kpis.commercial.devis_signes += (m.devis_signed as number) || 0
        kpis.commercial.ca_signe += (m.revenue as number) || 0
        break
      case 'ads':
        kpis.marketing.ad_spend += (m.spend as number) || 0
        kpis.marketing.impressions += (m.impressions as number) || 0
        kpis.marketing.clicks += (m.clicks as number) || 0
        kpis.marketing.leads_from_ads += (m.leads as number) || 0
        break
      case 'sav':
        kpis.satisfaction.tickets_sav += (m.tickets_total as number) || 0
        kpis.satisfaction.tickets_resolus += (m.tickets_resolved as number) || 0
        kpis.satisfaction.delai_moyen_resolution_h = (m.avg_resolution_hours as number) || 0
        break
      case 'finance':
        kpis.finance.ca_ht = (m.revenue_ht as number) || 0
        kpis.finance.marge_brute = (m.margin as number) || 0
        kpis.finance.tresorerie = (m.cash as number) || 0
        kpis.finance.charges_fixes = (m.fixed_costs as number) || 0
        kpis.operations.factures_emises += (m.invoices_sent as number) || 0
        kpis.operations.factures_payees += (m.invoices_paid as number) || 0
        kpis.operations.impayees += (m.unpaid as number) || 0
        break
      case 'operations':
        kpis.operations.chantiers_en_cours = (m.active as number) || 0
        kpis.operations.chantiers_termines += (m.completed as number) || 0
        kpis.operations.delai_moyen_jours = (m.avg_duration_days as number) || 0
        break
    }
  }

  // Computed rates
  if (kpis.commercial.devis_envoyes > 0) {
    kpis.commercial.taux_conversion = Math.round((kpis.commercial.devis_signes / kpis.commercial.devis_envoyes) * 1000) / 10
  }
  if (kpis.commercial.devis_signes > 0) {
    kpis.commercial.panier_moyen = Math.round(kpis.commercial.ca_signe / kpis.commercial.devis_signes)
  }
  if (kpis.marketing.clicks > 0 && kpis.marketing.impressions > 0) {
    kpis.marketing.ctr = Math.round((kpis.marketing.clicks / kpis.marketing.impressions) * 10000) / 100
  }
  if (kpis.marketing.clicks > 0) {
    kpis.marketing.cpc = Math.round((kpis.marketing.ad_spend / kpis.marketing.clicks) * 100) / 100
  }
  if (kpis.marketing.leads_from_ads > 0) {
    kpis.marketing.cost_per_lead = Math.round((kpis.marketing.ad_spend / kpis.marketing.leads_from_ads) * 100) / 100
  }
  if (kpis.operations.factures_emises > 0) {
    kpis.operations.taux_recouvrement = Math.round((kpis.operations.factures_payees / kpis.operations.factures_emises) * 1000) / 10
  }
  if (kpis.satisfaction.tickets_sav > 0) {
    kpis.satisfaction.taux_resolution = Math.round((kpis.satisfaction.tickets_resolus / kpis.satisfaction.tickets_sav) * 1000) / 10
  }
  if (kpis.finance.ca_ht > 0) {
    kpis.finance.marge_percent = Math.round((kpis.finance.marge_brute / kpis.finance.ca_ht) * 1000) / 10
  }

  return kpis
}

// ============================================
// ROI ANALYSIS
// ============================================

export function analyzeChannelROI(channels: {
  channel: string
  spend: number
  leads_generated: number
  leads_converted: number
  revenue_generated: number
}[]): ChannelROI[] {
  return channels.map(ch => {
    const costPerLead = ch.leads_generated > 0 ? ch.spend / ch.leads_generated : 0
    const costPerAcq = ch.leads_converted > 0 ? ch.spend / ch.leads_converted : 0
    const roi = ch.spend > 0 ? ((ch.revenue_generated - ch.spend) / ch.spend) * 100 : 0
    const convRate = ch.leads_generated > 0 ? (ch.leads_converted / ch.leads_generated) * 100 : 0

    return {
      channel: ch.channel,
      spend: ch.spend,
      leads_generated: ch.leads_generated,
      leads_converted: ch.leads_converted,
      revenue_generated: ch.revenue_generated,
      cost_per_lead: Math.round(costPerLead * 100) / 100,
      cost_per_acquisition: Math.round(costPerAcq * 100) / 100,
      roi_percent: Math.round(roi * 10) / 10,
      conversion_rate: Math.round(convRate * 10) / 10,
    }
  }).sort((a, b) => b.roi_percent - a.roi_percent)
}

// ============================================
// REPORT GENERATION
// ============================================

export function generateWeeklyReport(kpis: ConsolidatedKPIs, roiData: ChannelROI[]): WeeklyReport {
  const highlights: string[] = []
  const alerts: string[] = []
  const recommendations: string[] = []

  // Auto-generate highlights
  if (kpis.commercial.taux_conversion >= 30) highlights.push(`Taux de conversion excellent: ${kpis.commercial.taux_conversion}%`)
  if (kpis.commercial.leads_total > 0) highlights.push(`${kpis.commercial.leads_total} leads generes cette semaine`)
  if (kpis.satisfaction.taux_resolution >= 90) highlights.push(`Satisfaction client: ${kpis.satisfaction.taux_resolution}% de tickets resolus`)
  if (kpis.finance.marge_percent >= 25) highlights.push(`Marge saine: ${kpis.finance.marge_percent}%`)

  // Auto-generate alerts
  if (kpis.commercial.taux_conversion < 15) alerts.push(`Taux de conversion faible: ${kpis.commercial.taux_conversion}%`)
  if (kpis.marketing.cpc > 5) alerts.push(`CPC eleve: ${kpis.marketing.cpc}€ (objectif < 5€)`)
  if (kpis.operations.impayees > 0) alerts.push(`${kpis.operations.impayees} factures impayees`)
  if (kpis.satisfaction.taux_resolution < 80) alerts.push(`Taux resolution SAV bas: ${kpis.satisfaction.taux_resolution}%`)
  if (kpis.finance.marge_percent < 15) alerts.push(`Marge sous le seuil: ${kpis.finance.marge_percent}%`)

  // Auto-generate recommendations
  if (kpis.marketing.cost_per_lead > 50) recommendations.push('Optimiser le ciblage pub pour reduire le cout par lead')
  if (kpis.commercial.taux_conversion < 20) recommendations.push('Revoir le processus de qualification et le suivi commercial')
  if (kpis.operations.impayees > 3) recommendations.push('Intensifier les relances sur les factures impayees')

  const bestChannel = roiData.length > 0 ? roiData[0] : null
  if (bestChannel && bestChannel.roi_percent > 100) {
    recommendations.push(`Augmenter le budget sur ${bestChannel.channel} (ROI: ${bestChannel.roi_percent}%)`)
  }

  const html = generateReportHTML(kpis, roiData, highlights, alerts, recommendations)

  return {
    title: `Rapport Hebdomadaire — Semaine du ${kpis.date_range.start}`,
    period: kpis.period,
    date_range: kpis.date_range,
    kpis,
    roi_by_channel: roiData,
    highlights,
    alerts,
    recommendations,
    html,
  }
}

function generateReportHTML(
  kpis: ConsolidatedKPIs,
  roi: ChannelROI[],
  highlights: string[],
  alerts: string[],
  recommendations: string[]
): string {
  const fmt = (n: number) => n.toLocaleString('fr-FR')

  return `
    <div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#1F2937;">
      <h1 style="text-align:center;color:#1E40AF;margin-bottom:4px;">📊 Rapport Hebdomadaire</h1>
      <p style="text-align:center;color:#6B7280;margin-top:0;">Semaine du ${kpis.date_range.start} au ${kpis.date_range.end}</p>

      ${alerts.length > 0 ? `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:24px 0;">
          <h3 style="color:#991B1B;margin:0 0 8px;">⚠️ Alertes</h3>
          <ul style="margin:0;padding-left:20px;color:#DC2626;">
            ${alerts.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${highlights.length > 0 ? `
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:24px 0;">
          <h3 style="color:#166534;margin:0 0 8px;">✅ Points positifs</h3>
          <ul style="margin:0;padding-left:20px;color:#15803D;">
            ${highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0;">
        <div style="background:#EFF6FF;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#1E40AF;">${fmt(kpis.finance.ca_ht)}€</div>
          <div style="font-size:13px;color:#6B7280;">CA HT</div>
        </div>
        <div style="background:#F0FDF4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#166534;">${kpis.finance.marge_percent}%</div>
          <div style="font-size:13px;color:#6B7280;">Marge</div>
        </div>
        <div style="background:#FEF3C7;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#92400E;">${kpis.commercial.leads_total}</div>
          <div style="font-size:13px;color:#6B7280;">Leads</div>
        </div>
      </div>

      <h2 style="color:#1F2937;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">📈 Commercial</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#6B7280;">Leads total / qualifies</td><td style="text-align:right;font-weight:600;">${kpis.commercial.leads_total} / ${kpis.commercial.leads_qualified}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Devis envoyes / signes</td><td style="text-align:right;font-weight:600;">${kpis.commercial.devis_envoyes} / ${kpis.commercial.devis_signes}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Taux de conversion</td><td style="text-align:right;font-weight:600;">${kpis.commercial.taux_conversion}%</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">CA signe</td><td style="text-align:right;font-weight:600;">${fmt(kpis.commercial.ca_signe)}€</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Panier moyen</td><td style="text-align:right;font-weight:600;">${fmt(kpis.commercial.panier_moyen)}€</td></tr>
      </table>

      <h2 style="color:#1F2937;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">📣 Marketing</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#6B7280;">Budget pub</td><td style="text-align:right;font-weight:600;">${fmt(kpis.marketing.ad_spend)}€</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Impressions / Clics</td><td style="text-align:right;font-weight:600;">${fmt(kpis.marketing.impressions)} / ${fmt(kpis.marketing.clicks)}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">CTR / CPC</td><td style="text-align:right;font-weight:600;">${kpis.marketing.ctr}% / ${kpis.marketing.cpc}€</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Cout par lead</td><td style="text-align:right;font-weight:600;">${kpis.marketing.cost_per_lead}€</td></tr>
      </table>

      <h2 style="color:#1F2937;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">🔧 Operations</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#6B7280;">Chantiers en cours / termines</td><td style="text-align:right;font-weight:600;">${kpis.operations.chantiers_en_cours} / ${kpis.operations.chantiers_termines}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Factures emises / payees</td><td style="text-align:right;font-weight:600;">${kpis.operations.factures_emises} / ${kpis.operations.factures_payees}</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Taux recouvrement</td><td style="text-align:right;font-weight:600;">${kpis.operations.taux_recouvrement}%</td></tr>
        <tr><td style="padding:6px 0;color:#6B7280;">Impayees</td><td style="text-align:right;font-weight:600;${kpis.operations.impayees > 0 ? 'color:#DC2626;' : ''}">${kpis.operations.impayees}</td></tr>
      </table>

      ${roi.length > 0 ? `
        <h2 style="color:#1F2937;border-bottom:2px solid #E5E7EB;padding-bottom:8px;">📊 ROI par Canal</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#F3F4F6;">
              <th style="padding:8px;text-align:left;font-size:13px;color:#6B7280;">Canal</th>
              <th style="padding:8px;text-align:right;font-size:13px;color:#6B7280;">Depense</th>
              <th style="padding:8px;text-align:right;font-size:13px;color:#6B7280;">Leads</th>
              <th style="padding:8px;text-align:right;font-size:13px;color:#6B7280;">CA genere</th>
              <th style="padding:8px;text-align:right;font-size:13px;color:#6B7280;">ROI</th>
            </tr>
          </thead>
          <tbody>
            ${roi.map(r => `
              <tr>
                <td style="padding:8px;font-weight:600;">${r.channel}</td>
                <td style="padding:8px;text-align:right;">${fmt(r.spend)}€</td>
                <td style="padding:8px;text-align:right;">${r.leads_generated}</td>
                <td style="padding:8px;text-align:right;">${fmt(r.revenue_generated)}€</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:${r.roi_percent >= 0 ? '#166534' : '#DC2626'}">${r.roi_percent}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${recommendations.length > 0 ? `
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:16px;margin:24px 0;">
          <h3 style="color:#1E40AF;margin:0 0 8px;">💡 Recommandations</h3>
          <ul style="margin:0;padding-left:20px;color:#1E3A8A;">
            ${recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:32px;">
        Rapport genere automatiquement par Iris — ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}
      </p>
    </div>`
}

// ============================================
// TEXT REPORT (for email body)
// ============================================

export function generateWeeklyTextReport(kpis: ConsolidatedKPIs, roi: ChannelROI[]): string {
  const fmt = (n: number) => n.toLocaleString('fr-FR')
  let r = `📊 RAPPORT HEBDOMADAIRE — ${kpis.date_range.start} au ${kpis.date_range.end}\n`
  r += `${'='.repeat(55)}\n\n`

  r += `💰 FINANCE\n`
  r += `  CA HT: ${fmt(kpis.finance.ca_ht)}€ | Marge: ${kpis.finance.marge_percent}% | Tresorerie: ${fmt(kpis.finance.tresorerie)}€\n\n`

  r += `📈 COMMERCIAL\n`
  r += `  Leads: ${kpis.commercial.leads_total} | Devis: ${kpis.commercial.devis_envoyes}→${kpis.commercial.devis_signes} | Conv: ${kpis.commercial.taux_conversion}%\n`
  r += `  CA signe: ${fmt(kpis.commercial.ca_signe)}€ | Panier moyen: ${fmt(kpis.commercial.panier_moyen)}€\n\n`

  r += `📣 MARKETING\n`
  r += `  Budget: ${fmt(kpis.marketing.ad_spend)}€ | CTR: ${kpis.marketing.ctr}% | CPC: ${kpis.marketing.cpc}€ | CPL: ${kpis.marketing.cost_per_lead}€\n\n`

  r += `🔧 OPERATIONS\n`
  r += `  Chantiers: ${kpis.operations.chantiers_en_cours} en cours | Recouvrement: ${kpis.operations.taux_recouvrement}% | Impayees: ${kpis.operations.impayees}\n\n`

  r += `🛎 SAV\n`
  r += `  Tickets: ${kpis.satisfaction.tickets_sav} | Resolution: ${kpis.satisfaction.taux_resolution}% | Delai moyen: ${kpis.satisfaction.delai_moyen_resolution_h}h\n\n`

  if (roi.length > 0) {
    r += `📊 ROI PAR CANAL\n`
    for (const ch of roi) {
      r += `  ${ch.channel}: ${fmt(ch.spend)}€ depenses → ${fmt(ch.revenue_generated)}€ CA (ROI: ${ch.roi_percent}%)\n`
    }
  }

  return r
}
