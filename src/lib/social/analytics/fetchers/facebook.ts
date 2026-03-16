import type { AnalyticsFetcher, DailyMetrics } from '../types'

export class FacebookAnalyticsFetcher implements AnalyticsFetcher {
  async fetchDailyMetrics(accessToken: string, _platformUserId: string, date: Date, pageId?: string): Promise<DailyMetrics> {
    if (!pageId) return {}

    const since = Math.floor(date.getTime() / 1000)
    const until = since + 86400

    const metrics = 'page_impressions,page_engaged_users,page_post_engagements,page_fans,page_views_total'
    const url = `https://graph.facebook.com/v18.0/${pageId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}&access_token=${accessToken}`

    try {
      const res = await fetch(url)
      if (!res.ok) return {}
      const data = await res.json()

      const metricsMap: Record<string, number> = {}
      for (const item of data.data || []) {
        const value = item.values?.[0]?.value || 0
        metricsMap[item.name] = typeof value === 'number' ? value : 0
      }

      return {
        impressions: metricsMap['page_impressions'] || 0,
        reach: metricsMap['page_engaged_users'] || 0,
        likes: metricsMap['page_post_engagements'] || 0,
        followers_count: metricsMap['page_fans'] || 0,
        profile_views: metricsMap['page_views_total'] || 0,
        raw_data: metricsMap,
      }
    } catch {
      return {}
    }
  }
}
