export interface DailyMetrics {
  followers_count?: number
  following_count?: number
  impressions?: number
  reach?: number
  engagement_rate?: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  saves?: number
  profile_views?: number
  website_clicks?: number
  audience_data?: Record<string, unknown>
  raw_data?: Record<string, unknown>
}

export interface AnalyticsFetcher {
  fetchDailyMetrics(accessToken: string, platformUserId: string, date: Date, pageId?: string): Promise<DailyMetrics>
}
