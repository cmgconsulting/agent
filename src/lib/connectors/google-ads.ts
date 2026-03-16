/**
 * Google Ads API Integration for Hugo
 * Campaign listing, performance metrics, account overview
 * Uses GAQL (Google Ads Query Language) via searchStream
 * Note: Google Ads amounts are in micros (divide by 1,000,000)
 */

import { isTokenExpired, refreshOAuthToken, persistRefreshedTokens, handleTokenError, withTokenRefresh } from './token-refresh'

const GOOGLE_ADS_API_VERSION = 'v18'
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

export interface GoogleAdsAuth {
  access_token: string
  customer_id: string // Google Ads customer ID (without dashes, e.g., "1234567890")
  developer_token: string
  login_customer_id?: string // MCC account ID for manager accounts
  refresh_token?: string
  expires_at?: string
}

// Context for token refresh
let _connectorId = ''
let _clientId = ''

export function setGoogleAdsContext(connectorId: string, clientId: string) {
  _connectorId = connectorId
  _clientId = clientId
}

async function getValidGoogleAdsToken(auth: GoogleAdsAuth): Promise<string> {
  const creds = auth as unknown as Record<string, string>
  if (!isTokenExpired(creds)) {
    return auth.access_token
  }
  try {
    const result = await refreshOAuthToken('google_ads', creds)
    const updated = await persistRefreshedTokens(_connectorId, creds, result)
    auth.access_token = updated.access_token
    auth.expires_at = updated.expires_at
    return updated.access_token
  } catch (error) {
    await handleTokenError(_clientId, 'google_ads', error)
    throw error
  }
}

export interface GoogleAdsCampaign {
  id: string
  name: string
  status: string
  type: string
  dailyBudget: number // in EUR (converted from micros)
  impressions: number
  clicks: number
  cost: number // in EUR
  conversions: number
  ctr: number
  avgCpc: number
}

export interface AccountOverview {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCtr: number
  avgCpc: number
  avgCostPerConversion: number
  roas: number
  conversionValue: number
}

// ===== Helper =====

function microsToEur(micros: number): number {
  return micros / 1_000_000
}

async function buildHeaders(auth: GoogleAdsAuth): Promise<Record<string, string>> {
  const token = await getValidGoogleAdsToken(auth)
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'developer-token': auth.developer_token,
    'Content-Type': 'application/json',
  }
  if (auth.login_customer_id) {
    headers['login-customer-id'] = auth.login_customer_id
  }
  return headers
}

async function searchGoogleAds(auth: GoogleAdsAuth, query: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${auth.customer_id}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: await buildHeaders(auth),
      body: JSON.stringify({ query }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    const errorMsg = err.error?.message || err[0]?.error?.message || res.status
    throw new Error(`Google Ads API error: ${errorMsg}`)
  }

  const data = await res.json()
  const results: Record<string, unknown>[] = []
  for (const batch of data) {
    if (batch.results) {
      results.push(...batch.results)
    }
  }
  return results
}

// ===== Campaigns =====

export async function listCampaigns(
  auth: GoogleAdsAuth,
  status?: 'ENABLED' | 'PAUSED' | 'REMOVED'
): Promise<GoogleAdsCampaign[]> {
  async function doList(): Promise<GoogleAdsCampaign[]> {
    const statusFilter = status ? ` AND campaign.status = '${status}'` : ` AND campaign.status != 'REMOVED'`
    const query = `
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign.advertising_channel_type, campaign_budget.amount_micros,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS${statusFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `
    const results = await searchGoogleAds(auth, query)
    return results.map((row) => {
      const campaign = row.campaign as Record<string, unknown>
      const budget = row.campaignBudget as Record<string, unknown> | undefined
      const metrics = row.metrics as Record<string, unknown>
      return {
        id: String(campaign.id || ''),
        name: String(campaign.name || ''),
        status: String(campaign.status || ''),
        type: String(campaign.advertisingChannelType || ''),
        dailyBudget: microsToEur(Number(budget?.amountMicros || 0)),
        impressions: Number(metrics.impressions || 0),
        clicks: Number(metrics.clicks || 0),
        cost: microsToEur(Number(metrics.costMicros || 0)),
        conversions: Number(metrics.conversions || 0),
        ctr: Number(metrics.ctr || 0) * 100,
        avgCpc: microsToEur(Number(metrics.averageCpc || 0)),
      }
    })
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_ads', _clientId, auth as unknown as Record<string, string>, () => doList())
  }
  return doList()
}

// ===== Campaign Performance =====

export async function getCampaignPerformance(
  auth: GoogleAdsAuth,
  dateRange: { startDate: string; endDate: string }
): Promise<GoogleAdsCampaign[]> {
  async function doFetch(): Promise<GoogleAdsCampaign[]> {
    const query = `
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign.advertising_channel_type, campaign_budget.amount_micros,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `
    const results = await searchGoogleAds(auth, query)
    return results.map((row) => {
      const campaign = row.campaign as Record<string, unknown>
      const budget = row.campaignBudget as Record<string, unknown> | undefined
      const metrics = row.metrics as Record<string, unknown>
      return {
        id: String(campaign.id || ''),
        name: String(campaign.name || ''),
        status: String(campaign.status || ''),
        type: String(campaign.advertisingChannelType || ''),
        dailyBudget: microsToEur(Number(budget?.amountMicros || 0)),
        impressions: Number(metrics.impressions || 0),
        clicks: Number(metrics.clicks || 0),
        cost: microsToEur(Number(metrics.costMicros || 0)),
        conversions: Number(metrics.conversions || 0),
        ctr: Number(metrics.ctr || 0) * 100,
        avgCpc: microsToEur(Number(metrics.averageCpc || 0)),
      }
    })
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_ads', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Account Overview =====

export async function getAccountOverview(
  auth: GoogleAdsAuth,
  dateRange: { startDate: string; endDate: string }
): Promise<AccountOverview> {
  async function doFetch(): Promise<AccountOverview> {
    const query = `
      SELECT
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc,
        metrics.cost_per_conversion, metrics.conversions_value
      FROM customer
      WHERE segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
    `
    const results = await searchGoogleAds(auth, query)
    const metrics = (results[0]?.metrics || {}) as Record<string, unknown>
    const totalSpend = microsToEur(Number(metrics.costMicros || 0))
    const totalConversions = Number(metrics.conversions || 0)
    const conversionValue = Number(metrics.conversionsValue || 0)
    return {
      totalSpend,
      totalImpressions: Number(metrics.impressions || 0),
      totalClicks: Number(metrics.clicks || 0),
      totalConversions,
      avgCtr: Number(metrics.ctr || 0) * 100,
      avgCpc: microsToEur(Number(metrics.averageCpc || 0)),
      avgCostPerConversion: microsToEur(Number(metrics.costPerConversion || 0)),
      roas: totalSpend > 0 ? conversionValue / totalSpend : 0,
      conversionValue,
    }
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_ads', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Report Generation =====

export function generateGoogleAdsReport(
  overview: AccountOverview,
  campaigns: GoogleAdsCampaign[]
): string {
  const lines: string[] = [
    '=== RAPPORT GOOGLE ADS ===',
    '',
    `Depense totale : ${overview.totalSpend.toFixed(2)} EUR`,
    `Impressions : ${overview.totalImpressions.toLocaleString('fr-FR')}`,
    `Clics : ${overview.totalClicks.toLocaleString('fr-FR')}`,
    `CTR moyen : ${overview.avgCtr.toFixed(2)}%`,
    `CPC moyen : ${overview.avgCpc.toFixed(2)} EUR`,
    `Conversions : ${overview.totalConversions.toFixed(0)}`,
    overview.totalConversions > 0
      ? `Cout/conversion : ${overview.avgCostPerConversion.toFixed(2)} EUR`
      : '',
    overview.roas > 0 ? `ROAS : ${overview.roas.toFixed(2)}x` : '',
    '',
    '--- CAMPAGNES ---',
  ]

  for (const campaign of campaigns.slice(0, 15)) {
    lines.push('')
    lines.push(`Campagne : ${campaign.name} [${campaign.status}]`)
    lines.push(`  Budget/jour: ${campaign.dailyBudget.toFixed(2)} EUR | Depense: ${campaign.cost.toFixed(2)} EUR`)
    lines.push(`  Impressions: ${campaign.impressions.toLocaleString('fr-FR')} | Clics: ${campaign.clicks} | CTR: ${campaign.ctr.toFixed(2)}%`)
    if (campaign.conversions > 0) {
      lines.push(`  Conversions: ${campaign.conversions.toFixed(0)} | CPC: ${campaign.avgCpc.toFixed(2)} EUR`)
    }
  }

  return lines.filter(l => l !== undefined).join('\n')
}
