import type { AnalyticsFetcher, DailyMetrics } from '../types'

export class LinkedInAnalyticsFetcher implements AnalyticsFetcher {
  async fetchDailyMetrics(accessToken: string, platformUserId: string): Promise<DailyMetrics> {
    try {
      // Get basic profile stats (LinkedIn personal profiles have limited analytics)
      const res = await fetch(
        `https://api.linkedin.com/v2/networkSizes/urn:li:person:${platformUserId}?edgeType=CompanyFollowedByMember`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) return {}
      const data = await res.json()

      return {
        followers_count: data.firstDegreeSize || 0,
        raw_data: data,
      }
    } catch {
      return {}
    }
  }
}
