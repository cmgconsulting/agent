import type { AnalyticsFetcher, DailyMetrics } from '../types'

export class TwitterAnalyticsFetcher implements AnalyticsFetcher {
  async fetchDailyMetrics(accessToken: string, platformUserId: string): Promise<DailyMetrics> {
    try {
      const res = await fetch(
        `https://api.twitter.com/2/users/${platformUserId}?user.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) return {}
      const data = await res.json()
      const metrics = data.data?.public_metrics

      return {
        followers_count: metrics?.followers_count || 0,
        following_count: metrics?.following_count || 0,
        likes: metrics?.like_count || 0,
        raw_data: metrics || {},
      }
    } catch {
      return {}
    }
  }
}
