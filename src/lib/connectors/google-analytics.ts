/**
 * Google Analytics 4 (GA4) Integration for Iris
 * Audience overview, traffic sources, page views, conversions
 */

import { isTokenExpired, refreshOAuthToken, persistRefreshedTokens, handleTokenError, withTokenRefresh } from './token-refresh'

const GA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

export interface GoogleAnalyticsAuth {
  access_token: string
  refresh_token: string
  property_id: string // GA4 property ID (e.g., "properties/123456789")
  expires_at?: string
}

// Context for token refresh
let _connectorId = ''
let _clientId = ''

export function setGoogleAnalyticsContext(connectorId: string, clientId: string) {
  _connectorId = connectorId
  _clientId = clientId
}

async function getValidGAToken(auth: GoogleAnalyticsAuth): Promise<string> {
  const creds = auth as unknown as Record<string, string>
  if (!isTokenExpired(creds)) {
    return auth.access_token
  }
  try {
    const result = await refreshOAuthToken('google_analytics', creds)
    const updated = await persistRefreshedTokens(_connectorId, creds, result)
    auth.access_token = updated.access_token
    auth.expires_at = updated.expires_at
    return updated.access_token
  } catch (error) {
    await handleTokenError(_clientId, 'google_analytics', error)
    throw error
  }
}

export interface AudienceOverview {
  totalUsers: number
  newUsers: number
  sessions: number
  bounceRate: number
  avgSessionDuration: number // in seconds
  screenPageViews: number
}

export interface TrafficSource {
  source: string
  medium: string
  sessions: number
  users: number
  bounceRate: number
}

export interface PageViewData {
  pagePath: string
  pageTitle: string
  screenPageViews: number
  users: number
  avgEngagementTime: number
}

export interface ConversionEvent {
  eventName: string
  eventCount: number
  totalUsers: number
}

// ===== Helper =====

async function runReport(auth: GoogleAnalyticsAuth, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await getValidGAToken(auth)

  const res = await fetch(`${GA_API_BASE}/${auth.property_id}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Google Analytics API error: ${err.error?.message || res.status}`)
  }

  return await res.json()
}

// ===== Audience Overview =====

export async function getAudienceOverview(
  auth: GoogleAnalyticsAuth,
  dateRange: { startDate: string; endDate: string }
): Promise<AudienceOverview> {
  async function doFetch(): Promise<AudienceOverview> {
    const data = await runReport(auth, {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      metrics: [
        { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'sessions' },
        { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'screenPageViews' },
      ],
    })
    const row = (data.rows as { metricValues: { value: string }[] }[])?.[0]
    const vals = row?.metricValues || []
    return {
      totalUsers: Number(vals[0]?.value || 0),
      newUsers: Number(vals[1]?.value || 0),
      sessions: Number(vals[2]?.value || 0),
      bounceRate: Number(vals[3]?.value || 0),
      avgSessionDuration: Number(vals[4]?.value || 0),
      screenPageViews: Number(vals[5]?.value || 0),
    }
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_analytics', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Traffic Sources =====

export async function getTrafficSources(
  auth: GoogleAnalyticsAuth,
  dateRange: { startDate: string; endDate: string },
  limit: number = 20
): Promise<TrafficSource[]> {
  async function doFetch(): Promise<TrafficSource[]> {
    const data = await runReport(auth, {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    })
    const rows = (data.rows as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) || []
    return rows.map(row => ({
      source: row.dimensionValues[0]?.value || '(direct)',
      medium: row.dimensionValues[1]?.value || '(none)',
      sessions: Number(row.metricValues[0]?.value || 0),
      users: Number(row.metricValues[1]?.value || 0),
      bounceRate: Number(row.metricValues[2]?.value || 0),
    }))
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_analytics', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Page Views =====

export async function getPageViews(
  auth: GoogleAnalyticsAuth,
  dateRange: { startDate: string; endDate: string },
  limit: number = 20
): Promise<PageViewData[]> {
  async function doFetch(): Promise<PageViewData[]> {
    const data = await runReport(auth, {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'userEngagementDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    })
    const rows = (data.rows as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) || []
    return rows.map(row => ({
      pagePath: row.dimensionValues[0]?.value || '',
      pageTitle: row.dimensionValues[1]?.value || '',
      screenPageViews: Number(row.metricValues[0]?.value || 0),
      users: Number(row.metricValues[1]?.value || 0),
      avgEngagementTime: Number(row.metricValues[2]?.value || 0),
    }))
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_analytics', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Conversions =====

export async function getConversions(
  auth: GoogleAnalyticsAuth,
  dateRange: { startDate: string; endDate: string }
): Promise<ConversionEvent[]> {
  async function doFetch(): Promise<ConversionEvent[]> {
    const data = await runReport(auth, {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'isConversionEvent',
          stringFilter: { value: 'true' },
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 20,
    })
    const rows = (data.rows as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) || []
    return rows.map(row => ({
      eventName: row.dimensionValues[0]?.value || '',
      eventCount: Number(row.metricValues[0]?.value || 0),
      totalUsers: Number(row.metricValues[1]?.value || 0),
    }))
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'google_analytics', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Report Generation =====

export function generateGAReport(
  overview: AudienceOverview,
  traffic: TrafficSource[],
  pages: PageViewData[]
): string {
  const avgDurationMin = Math.round(overview.avgSessionDuration / 60 * 10) / 10

  const lines: string[] = [
    '=== RAPPORT GOOGLE ANALYTICS ===',
    '',
    `Utilisateurs : ${overview.totalUsers.toLocaleString('fr-FR')}`,
    `Nouveaux utilisateurs : ${overview.newUsers.toLocaleString('fr-FR')}`,
    `Sessions : ${overview.sessions.toLocaleString('fr-FR')}`,
    `Taux de rebond : ${(overview.bounceRate * 100).toFixed(1)}%`,
    `Duree moyenne session : ${avgDurationMin} min`,
    `Pages vues : ${overview.screenPageViews.toLocaleString('fr-FR')}`,
    '',
    '--- SOURCES DE TRAFIC ---',
  ]

  for (const src of traffic.slice(0, 10)) {
    lines.push(`  ${src.source} / ${src.medium} : ${src.sessions} sessions, ${src.users} utilisateurs`)
  }

  lines.push('')
  lines.push('--- PAGES LES PLUS VUES ---')

  for (const page of pages.slice(0, 10)) {
    lines.push(`  ${page.pagePath} : ${page.screenPageViews} vues (${page.users} utilisateurs)`)
  }

  return lines.join('\n')
}
