import { decryptCredentials } from '@/lib/vault'
import type { SocialAccount } from '@/types/database'
import type { SocialPublisher, PublishRequest, PublishResult } from './types'

export class TwitterPublisher implements SocialPublisher {
  async publish(account: SocialAccount, post: PublishRequest): Promise<PublishResult> {
    try {
      if (!account.access_token_encrypted) {
        return { success: false, error: 'Token d\'acces manquant' }
      }
      const { token: accessToken } = decryptCredentials(account.access_token_encrypted)

      const tweetBody: Record<string, unknown> = {
        text: post.content,
      }

      // Media upload if needed
      if (post.mediaUrls?.length) {
        const mediaIds = await this.uploadMedia(accessToken, post.mediaUrls)
        if (mediaIds.length > 0) {
          tweetBody.media = { media_ids: mediaIds }
        }
      }

      const res = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetBody),
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, error: `Twitter API error: ${err}` }
      }

      const data = await res.json()
      const tweetId = data.data?.id
      return {
        success: true,
        platformPostId: tweetId,
        url: `https://twitter.com/${account.platform_username}/status/${tweetId}`,
      }
    } catch (error) {
      return { success: false, error: `Twitter publish error: ${(error as Error).message}` }
    }
  }

  private async uploadMedia(accessToken: string, mediaUrls: string[]): Promise<string[]> {
    // Twitter v2 media upload requires v1.1 endpoint
    // For now, return empty — media upload requires OAuth 1.0a or specific v2 endpoints
    // Full implementation would use chunked upload via https://upload.twitter.com/1.1/media/upload.json
    console.warn('Twitter media upload not fully implemented — posting text only')
    void accessToken
    void mediaUrls
    return []
  }
}
