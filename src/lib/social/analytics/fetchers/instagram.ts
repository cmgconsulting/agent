import type { AnalyticsFetcher, DailyMetrics } from '../types'

export class InstagramAnalyticsFetcher implements AnalyticsFetcher {
  async fetchDailyMetrics(accessToken: string, platformUserId: string, date: Date): Promise<DailyMetrics> {
    const since = Math.floor(date.getTime() / 1000)
    const until = since + 86400

    try {
      // Get insights
      const metrics = 'impressions,reach,follower_count,profile_views,website_clicks'
      const url = `https://graph.facebook.com/v18.0/${platformUserId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}&access_token=${accessToken}`

      const res = await fetch(url)
      if (!res.ok) return {}
      const data = await res.json()

      const metricsMap: Record<string, number> = {}
      for (const item of data.data || []) {
        const value = item.values?.[0]?.value || 0
        metricsMap[item.name] = typeof value === 'number' ? value : 0
      }

      return {
        impressions: metricsMap['impressions'] || 0,
        reach: metricsMap['reach'] || 0,
        followers_count: metricsMap['follower_count'] || 0,
        profile_views: metricsMap['profile_views'] || 0,
        website_clicks: metricsMap['website_clicks'] || 0,
        raw_data: metricsMap,
      }
    } catch {
      return {}
    }
  }
}
