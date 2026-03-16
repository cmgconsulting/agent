/**
 * LinkedIn Marketing API Integration for Eva
 * Organization followers, share statistics, page analytics
 */

import { isTokenExpired, refreshOAuthToken, persistRefreshedTokens, handleTokenError, withTokenRefresh } from './token-refresh'

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

export interface LinkedInAuth {
  access_token: string
  organization_id: string // LinkedIn organization URN ID (numeric)
  refresh_token?: string
  expires_at?: string
}

// Context for token refresh
let _connectorId = ''
let _clientId = ''

export function setLinkedInContext(connectorId: string, clientId: string) {
  _connectorId = connectorId
  _clientId = clientId
}

async function getValidLinkedInToken(auth: LinkedInAuth): Promise<string> {
  const creds = auth as unknown as Record<string, string>
  if (!isTokenExpired(creds)) {
    return auth.access_token
  }
  try {
    const result = await refreshOAuthToken('linkedin_api', creds)
    const updated = await persistRefreshedTokens(_connectorId, creds, result)
    auth.access_token = updated.access_token
    auth.expires_at = updated.expires_at
    return updated.access_token
  } catch (error) {
    await handleTokenError(_clientId, 'linkedin_api', error)
    throw error
  }
}

export interface FollowerStats {
  totalFollowers: number
  organicFollowers: number
  paidFollowers: number
}

export interface ShareStatistics {
  totalShareCount: number
  totalImpressions: number
  totalClicks: number
  totalEngagement: number
  totalLikes: number
  totalComments: number
  totalShares: number
  engagementRate: number
}

export interface PageStatistics {
  totalPageViews: number
  uniqueVisitors: number
  mobilePageViews: number
  desktopPageViews: number
}

// ===== Helper =====

async function linkedinFetch(auth: LinkedInAuth, endpoint: string): Promise<Record<string, unknown>> {
  const token = await getValidLinkedInToken(auth)

  const res = await fetch(`${LINKEDIN_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn API error (${res.status}): ${err}`)
  }

  return await res.json()
}

// ===== Followers =====

export async function getOrganizationFollowers(auth: LinkedInAuth): Promise<FollowerStats> {
  async function doFetch(): Promise<FollowerStats> {
    const data = await linkedinFetch(
      auth,
      `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${auth.organization_id}`
    )
    const elements = (data.elements as Record<string, unknown>[]) || []
    const stats = elements[0] || {}
    const followerCounts = stats.followerCounts as Record<string, number> | undefined
    return {
      totalFollowers: (followerCounts?.organicFollowerCount || 0) + (followerCounts?.paidFollowerCount || 0),
      organicFollowers: followerCounts?.organicFollowerCount || 0,
      paidFollowers: followerCounts?.paidFollowerCount || 0,
    }
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'linkedin_api', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Share Statistics =====

export async function getShareStatistics(
  auth: LinkedInAuth,
  dateRange: { startDate: string; endDate: string }
): Promise<ShareStatistics> {
  async function doFetch(): Promise<ShareStatistics> {
    const startMs = new Date(dateRange.startDate).getTime()
    const endMs = new Date(dateRange.endDate).getTime()

    const data = await linkedinFetch(
      auth,
      `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${auth.organization_id}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startMs}&timeIntervals.timeRange.end=${endMs}`
    )

    const elements = (data.elements as Record<string, unknown>[]) || []
    let totalImpressions = 0, totalClicks = 0, totalLikes = 0
    let totalComments = 0, totalShares = 0, totalEngagement = 0, totalShareCount = 0

    for (const el of elements) {
      const stats = el.totalShareStatistics as Record<string, number> | undefined
      if (stats) {
        totalShareCount += stats.shareCount || 0
        totalImpressions += stats.impressionCount || 0
        totalClicks += stats.clickCount || 0
        totalLikes += stats.likeCount || 0
        totalComments += stats.commentCount || 0
        totalShares += stats.shareCount || 0
        totalEngagement += stats.engagement || 0
      }
    }

    const engagementRate = totalImpressions > 0
      ? ((totalLikes + totalComments + totalShares + totalClicks) / totalImpressions) * 100
      : 0

    return {
      totalShareCount, totalImpressions, totalClicks, totalEngagement,
      totalLikes, totalComments, totalShares, engagementRate,
    }
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'linkedin_api', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Page Statistics =====

export async function getPageStatistics(auth: LinkedInAuth): Promise<PageStatistics> {
  async function doFetch(): Promise<PageStatistics> {
    const data = await linkedinFetch(
      auth,
      `/organizationPageStatistics?q=organization&organization=urn:li:organization:${auth.organization_id}`
    )
    const elements = (data.elements as Record<string, unknown>[]) || []
    const stats = elements[0] || {}
    const views = stats.views as Record<string, unknown> | undefined
    const allViews = views?.allPageViews as Record<string, number> | undefined
    return {
      totalPageViews: allViews?.pageViews || 0,
      uniqueVisitors: allViews?.uniquePageViews || 0,
      mobilePageViews: (views?.mobilePageViews as Record<string, number>)?.pageViews || 0,
      desktopPageViews: (views?.desktopPageViews as Record<string, number>)?.pageViews || 0,
    }
  }

  if (_connectorId && _clientId) {
    return withTokenRefresh(_connectorId, 'linkedin_api', _clientId, auth as unknown as Record<string, string>, () => doFetch())
  }
  return doFetch()
}

// ===== Report Generation =====

export function generateLinkedInReport(
  followers: FollowerStats,
  shares: ShareStatistics,
  pageStats: PageStatistics
): string {
  const lines: string[] = [
    '=== RAPPORT LINKEDIN ===',
    '',
    '--- ABONNES ---',
    `Total abonnes : ${followers.totalFollowers.toLocaleString('fr-FR')}`,
    `  Organiques : ${followers.organicFollowers.toLocaleString('fr-FR')}`,
    `  Sponsorises : ${followers.paidFollowers.toLocaleString('fr-FR')}`,
    '',
    '--- PUBLICATIONS ---',
    `Publications : ${shares.totalShareCount}`,
    `Impressions : ${shares.totalImpressions.toLocaleString('fr-FR')}`,
    `Clics : ${shares.totalClicks.toLocaleString('fr-FR')}`,
    `Likes : ${shares.totalLikes.toLocaleString('fr-FR')}`,
    `Commentaires : ${shares.totalComments.toLocaleString('fr-FR')}`,
    `Partages : ${shares.totalShares.toLocaleString('fr-FR')}`,
    `Taux d'engagement : ${shares.engagementRate.toFixed(2)}%`,
    '',
    '--- PAGE ---',
    `Vues de page : ${pageStats.totalPageViews.toLocaleString('fr-FR')}`,
    `Visiteurs uniques : ${pageStats.uniqueVisitors.toLocaleString('fr-FR')}`,
    `Vues mobile : ${pageStats.mobilePageViews.toLocaleString('fr-FR')}`,
    `Vues desktop : ${pageStats.desktopPageViews.toLocaleString('fr-FR')}`,
  ]

  return lines.join('\n')
}
