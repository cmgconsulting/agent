import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/vault'
import { refreshAccessToken } from '@/lib/social/oauth'
import { encryptCredentials } from '@/lib/vault'
import { FacebookAnalyticsFetcher } from './fetchers/facebook'
import { InstagramAnalyticsFetcher } from './fetchers/instagram'
import { LinkedInAnalyticsFetcher } from './fetchers/linkedin'
import { TwitterAnalyticsFetcher } from './fetchers/twitter'
import { TikTokAnalyticsFetcher } from './fetchers/tiktok'
import { GoogleAdsAnalyticsFetcher } from './fetchers/google-ads'
import type { AnalyticsFetcher } from './types'
import type { SocialPlatform } from '@/types/database'

const fetchers: Record<SocialPlatform, AnalyticsFetcher> = {
  facebook: new FacebookAnalyticsFetcher(),
  instagram: new InstagramAnalyticsFetcher(),
  linkedin: new LinkedInAnalyticsFetcher(),
  twitter: new TwitterAnalyticsFetcher(),
  tiktok: new TikTokAnalyticsFetcher(),
  google_ads: new GoogleAdsAnalyticsFetcher(),
}

/**
 * Sync analytics for all active accounts of a client.
 */
export async function syncAnalyticsForClient(clientId: string): Promise<{ synced: number; errors: number }> {
  const supabase = createServiceRoleClient()
  let synced = 0
  let errors = 0

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')

  if (!accounts?.length) return { synced: 0, errors: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const account of accounts) {
    try {
      let accessToken: string

      // Check if token needs refresh
      if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
        if (account.refresh_token_encrypted) {
          const { token: refreshToken } = decryptCredentials(account.refresh_token_encrypted)
          const tokens = await refreshAccessToken(account.platform as SocialPlatform, refreshToken)

          accessToken = tokens.accessToken

          // Update stored tokens
          await supabase
            .from('social_accounts')
            .update({
              access_token_encrypted: encryptCredentials({ token: tokens.accessToken }),
              refresh_token_encrypted: tokens.refreshToken
                ? encryptCredentials({ token: tokens.refreshToken })
                : account.refresh_token_encrypted,
              token_expires_at: tokens.expiresIn
                ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
                : null,
              status: 'active',
              last_error: null,
            })
            .eq('id', account.id)
        } else {
          await supabase
            .from('social_accounts')
            .update({ status: 'expired', last_error: 'Token expire sans refresh token' })
            .eq('id', account.id)
          errors++
          continue
        }
      } else {
        const { token } = decryptCredentials(account.access_token_encrypted)
        accessToken = token
      }

      // Fetch metrics
      const fetcher = fetchers[account.platform as SocialPlatform]
      const metrics = await fetcher.fetchDailyMetrics(
        accessToken,
        account.platform_user_id,
        today,
        account.page_id || undefined
      )

      // Upsert analytics
      await supabase
        .from('social_analytics')
        .upsert({
          client_id: clientId,
          social_account_id: account.id,
          platform: account.platform,
          metric_date: today.toISOString().split('T')[0],
          ...metrics,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'social_account_id,metric_date',
        })

      // Update last synced
      await supabase
        .from('social_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id)

      synced++
    } catch (error) {
      console.error(`Analytics sync error for account ${account.id}:`, error)
      errors++

      await supabase
        .from('social_accounts')
        .update({ last_error: (error as Error).message })
        .eq('id', account.id)
    }
  }

  return { synced, errors }
}
