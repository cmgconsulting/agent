/**
 * Meta Ads API Integration for Hugo
 * Campaign performance reports, budget monitoring, and alerts
 */

import { isTokenExpired, refreshOAuthToken, persistRefreshedTokens, handleTokenError, withTokenRefresh } from './token-refresh'

const META_API_VERSION = 'v19.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaAdsAuth {
  access_token: string
  ad_account_id: string // format: act_XXXXX
  expires_at?: string
  refresh_token?: string
}

// Context for token refresh
let _connectorId = ''
let _clientId = ''

export function setMetaAdsContext(connectorId: string, clientId: string) {
  _connectorId = connectorId
  _clientId = clientId
}

async function getValidMetaToken(auth: MetaAdsAuth): Promise<string> {
  const creds = auth as unknown as Record<string, string>
  if (!isTokenExpired(creds)) {
    return auth.access_token
  }
  try {
    const result = await refreshOAuthToken('meta_ads', creds)
    const updated = await persistRefreshedTokens(_connectorId, creds, result)
    // Mutate auth in place for subsequent calls in the same session
    auth.access_token = updated.access_token
    auth.expires_at = updated.expires_at
    return updated.access_token
  } catch (error) {
    await handleTokenError(_clientId, 'meta_ads', error)
    throw error
  }
}

export interface CampaignSummary {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: number
  lifetime_budget?: number
  start_time?: string
  stop_time?: string
}

export interface CampaignInsights {
  campaign_id: string
  campaign_name: string
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  cpm: number
  conversions: number
  cost_per_conversion: number
  reach: number
  frequency: number
}

export interface BudgetAlert {
  campaign_id: string
  campaign_name: string
  alert_type: 'overspend' | 'underspend' | 'high_cpc' | 'low_ctr'
  severity: 'warning' | 'critical'
  message: string
  current_value: number
  threshold: number
}

// ===== Campaigns =====

export async function listCampaigns(auth: MetaAdsAuth, params?: {
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  limit?: number
}): Promise<CampaignSummary[]> {
  async function doList(): Promise<CampaignSummary[]> {
    const token = await getValidMetaToken(auth)
    const fields = 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time'
    const filterStatus = params?.status ? `&filtering=[{"field":"effective_status","operator":"IN","value":["${params.status}"]}]` : ''
    const limit = params?.limit || 25

    const res = await fetch(
      `${META_API_BASE}/${auth.ad_account_id}/campaigns?fields=${fields}&limit=${limit}${filterStatus}&access_token=${token}`
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Meta Ads API error: ${err.error?.message || res.status}`)
    }
    const data = await res.json()
    return (data.data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.name as string,
      status: c.status as string,
      objective: c.objective as string,
      daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
      lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : undefined,
      start_time: c.start_time as string | undefined,
      stop_time: c.stop_time as string | undefined,
    }))
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'meta_ads', _clientId, auth as unknown as Record<string, string>, () => doList())
  }
  return doList()
}

// ===== Insights =====

export async function getCampaignInsights(auth: MetaAdsAuth, params?: {
  campaign_ids?: string[]
  date_preset?: 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month'
  time_range?: { since: string; until: string }
}): Promise<CampaignInsights[]> {
  const fields = 'campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,cpm,actions,reach,frequency'
  const datePreset = params?.date_preset || 'last_7d'

  async function doInsights(): Promise<CampaignInsights[]> {
    const token = await getValidMetaToken(auth)
    let endpoint = `${META_API_BASE}/${auth.ad_account_id}/insights?fields=${fields}&level=campaign&date_preset=${datePreset}&access_token=${token}`

    if (params?.time_range) {
      endpoint = `${META_API_BASE}/${auth.ad_account_id}/insights?fields=${fields}&level=campaign&time_range={"since":"${params.time_range.since}","until":"${params.time_range.until}"}&access_token=${token}`
    }

    if (params?.campaign_ids && params.campaign_ids.length > 0) {
      endpoint += `&filtering=[{"field":"campaign.id","operator":"IN","value":${JSON.stringify(params.campaign_ids)}}]`
    }

    const res = await fetch(endpoint)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Meta Ads insights error: ${err.error?.message || res.status}`)
    }

    const data = await res.json()
    return (data.data || []).map((insight: Record<string, unknown>) => {
    const actions = (insight.actions as { action_type: string; value: string }[] | undefined) || []
    const conversions = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'lead')
    const conversionCount = conversions ? Number(conversions.value) : 0
    const spend = Number(insight.spend || 0)

    return {
      campaign_id: insight.campaign_id as string,
      campaign_name: insight.campaign_name as string,
      impressions: Number(insight.impressions || 0),
      clicks: Number(insight.clicks || 0),
      spend,
      ctr: Number(insight.ctr || 0),
      cpc: Number(insight.cpc || 0),
      cpm: Number(insight.cpm || 0),
      conversions: conversionCount,
      cost_per_conversion: conversionCount > 0 ? spend / conversionCount : 0,
      reach: Number(insight.reach || 0),
      frequency: Number(insight.frequency || 0),
    }
    })
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'meta_ads', _clientId, auth as unknown as Record<string, string>, () => doInsights())
  }
  return doInsights()
}

// ===== Account-level spend =====

export async function getAccountSpend(auth: MetaAdsAuth, datePreset: string = 'this_month'): Promise<{
  total_spend: number
  impressions: number
  clicks: number
  ctr: number
}> {
  async function doSpend() {
    const token = await getValidMetaToken(auth)
    const fields = 'spend,impressions,clicks,ctr'
    const res = await fetch(
      `${META_API_BASE}/${auth.ad_account_id}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Meta Ads account insights error: ${err.error?.message || res.status}`)
    }
    const data = await res.json()
    const d = data.data?.[0] || {}
    return {
      total_spend: Number(d.spend || 0),
      impressions: Number(d.impressions || 0),
      clicks: Number(d.clicks || 0),
      ctr: Number(d.ctr || 0),
    }
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'meta_ads', _clientId, auth as unknown as Record<string, string>, () => doSpend())
  }
  return doSpend()
}

// ===== Budget Alerts =====

export function checkBudgetAlerts(
  insights: CampaignInsights[],
  thresholds?: {
    max_cpc?: number
    min_ctr?: number
    max_daily_spend?: number
    min_daily_spend?: number
  }
): BudgetAlert[] {
  const alerts: BudgetAlert[] = []
  const maxCPC = thresholds?.max_cpc || 5 // 5 EUR default
  const minCTR = thresholds?.min_ctr || 0.5 // 0.5% default
  const maxDailySpend = thresholds?.max_daily_spend || 100
  const minDailySpend = thresholds?.min_daily_spend || 5

  for (const insight of insights) {
    if (insight.cpc > maxCPC && insight.clicks > 10) {
      alerts.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        alert_type: 'high_cpc',
        severity: insight.cpc > maxCPC * 2 ? 'critical' : 'warning',
        message: `CPC eleve: ${insight.cpc.toFixed(2)} EUR (seuil: ${maxCPC} EUR)`,
        current_value: insight.cpc,
        threshold: maxCPC,
      })
    }

    if (insight.ctr < minCTR && insight.impressions > 1000) {
      alerts.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        alert_type: 'low_ctr',
        severity: insight.ctr < minCTR / 2 ? 'critical' : 'warning',
        message: `CTR faible: ${insight.ctr.toFixed(2)}% (seuil: ${minCTR}%)`,
        current_value: insight.ctr,
        threshold: minCTR,
      })
    }

    if (insight.spend > maxDailySpend) {
      alerts.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        alert_type: 'overspend',
        severity: insight.spend > maxDailySpend * 1.5 ? 'critical' : 'warning',
        message: `Depassement budget: ${insight.spend.toFixed(2)} EUR (seuil: ${maxDailySpend} EUR)`,
        current_value: insight.spend,
        threshold: maxDailySpend,
      })
    }

    if (insight.spend < minDailySpend && insight.spend > 0) {
      alerts.push({
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        alert_type: 'underspend',
        severity: 'warning',
        message: `Sous-utilisation budget: ${insight.spend.toFixed(2)} EUR (minimum: ${minDailySpend} EUR)`,
        current_value: insight.spend,
        threshold: minDailySpend,
      })
    }
  }

  return alerts
}

// ===== Report Generation =====

export function generateAdReport(insights: CampaignInsights[], alerts: BudgetAlert[]): string {
  const totalSpend = insights.reduce((s, i) => s + i.spend, 0)
  const totalClicks = insights.reduce((s, i) => s + i.clicks, 0)
  const totalImpressions = insights.reduce((s, i) => s + i.impressions, 0)
  const totalConversions = insights.reduce((s, i) => s + i.conversions, 0)
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0

  const lines: string[] = [
    '=== RAPPORT PUBLICITAIRE META ADS ===',
    '',
    `Depense totale : ${totalSpend.toFixed(2)} EUR`,
    `Impressions : ${totalImpressions.toLocaleString('fr-FR')}`,
    `Clics : ${totalClicks.toLocaleString('fr-FR')}`,
    `CTR moyen : ${avgCTR.toFixed(2)}%`,
    `CPC moyen : ${avgCPC.toFixed(2)} EUR`,
    `Conversions : ${totalConversions}`,
    totalConversions > 0 ? `Cout/conversion : ${(totalSpend / totalConversions).toFixed(2)} EUR` : '',
    '',
    '--- DETAIL PAR CAMPAGNE ---',
  ]

  for (const insight of insights) {
    lines.push(``)
    lines.push(`Campagne : ${insight.campaign_name}`)
    lines.push(`  Depense: ${insight.spend.toFixed(2)} EUR | Clics: ${insight.clicks} | CTR: ${insight.ctr.toFixed(2)}% | CPC: ${insight.cpc.toFixed(2)} EUR`)
    if (insight.conversions > 0) {
      lines.push(`  Conversions: ${insight.conversions} | Cout/conv: ${insight.cost_per_conversion.toFixed(2)} EUR`)
    }
  }

  if (alerts.length > 0) {
    lines.push('')
    lines.push('--- ALERTES ---')
    for (const alert of alerts) {
      const icon = alert.severity === 'critical' ? '[CRITIQUE]' : '[ATTENTION]'
      lines.push(`${icon} ${alert.campaign_name}: ${alert.message}`)
    }
  }

  return lines.filter(l => l !== undefined).join('\n')
}
