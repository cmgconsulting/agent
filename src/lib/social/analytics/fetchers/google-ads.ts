import type { AnalyticsFetcher, DailyMetrics } from '../types'

export class GoogleAdsAnalyticsFetcher implements AnalyticsFetcher {
  async fetchDailyMetrics(accessToken: string): Promise<DailyMetrics> {
    try {
      // Google Ads API requires developer token and customer ID
      // Basic implementation — full integration needs Google Ads API client
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
      if (!developerToken) return {}

      // For now, return empty metrics — full implementation requires
      // Google Ads API client library and customer ID
      void accessToken
      return {
        impressions: 0,
        clicks: 0,
        raw_data: {},
      }
    } catch {
      return {}
    }
  }
}
