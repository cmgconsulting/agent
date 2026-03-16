import type { AnalyticsFetcher, DailyMetrics } from '../types'

export class TikTokAnalyticsFetcher implements AnalyticsFetcher {
  async fetchDailyMetrics(accessToken: string): Promise<DailyMetrics> {
    try {
      const res = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) return {}
      const data = await res.json()
      const user = data.data?.user

      return {
        followers_count: user?.follower_count || 0,
        following_count: user?.following_count || 0,
        likes: user?.likes_count || 0,
        raw_data: user || {},
      }
    } catch {
      return {}
    }
  }
}
