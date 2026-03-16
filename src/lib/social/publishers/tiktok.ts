import { decryptCredentials } from '@/lib/vault'
import type { SocialAccount } from '@/types/database'
import type { SocialPublisher, PublishRequest, PublishResult } from './types'

export class TikTokPublisher implements SocialPublisher {
  async publish(account: SocialAccount, post: PublishRequest): Promise<PublishResult> {
    try {
      if (!account.access_token_encrypted) {
        return { success: false, error: 'Token d\'acces manquant' }
      }
      const { token: accessToken } = decryptCredentials(account.access_token_encrypted)

      if (!post.mediaUrls?.length) {
        return { success: false, error: 'TikTok requiert une video' }
      }

      // Step 1: Initialize content post
      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: post.content?.slice(0, 150) || '',
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: post.mediaUrls[0],
          },
        }),
      })

      if (!initRes.ok) {
        const err = await initRes.text()
        return { success: false, error: `TikTok init error: ${err}` }
      }

      const initData = await initRes.json()

      if (initData.error?.code !== 'ok' && initData.error?.code) {
        return { success: false, error: `TikTok error: ${initData.error.message}` }
      }

      const publishId = initData.data?.publish_id
      return {
        success: true,
        platformPostId: publishId,
      }
    } catch (error) {
      return { success: false, error: `TikTok publish error: ${(error as Error).message}` }
    }
  }
}
