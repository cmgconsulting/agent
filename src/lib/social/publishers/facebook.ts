import { decryptCredentials } from '@/lib/vault'
import type { SocialAccount } from '@/types/database'
import type { SocialPublisher, PublishRequest, PublishResult } from './types'

export class FacebookPublisher implements SocialPublisher {
  async publish(account: SocialAccount, post: PublishRequest): Promise<PublishResult> {
    try {
      if (!account.page_id) {
        return { success: false, error: 'Aucune page Facebook connectee' }
      }

      if (!account.access_token_encrypted) {
        return { success: false, error: 'Token d\'acces manquant' }
      }
      const { token: accessToken } = decryptCredentials(account.access_token_encrypted)

      // Get page access token
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
      )
      if (!pagesRes.ok) {
        return { success: false, error: 'Impossible de recuperer les pages' }
      }
      const pagesData = await pagesRes.json()
      const page = pagesData.data?.find((p: { id: string }) => p.id === account.page_id)
      if (!page) {
        return { success: false, error: 'Page non trouvee' }
      }
      const pageAccessToken = page.access_token

      // Publish based on type
      if (post.mediaUrls?.length && (post.postType === 'image' || post.postType === 'carousel')) {
        return this.publishWithMedia(account.page_id, pageAccessToken, post)
      }

      // Text post
      const res = await fetch(`https://graph.facebook.com/v18.0/${account.page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: post.content,
          access_token: pageAccessToken,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, error: `Facebook API error: ${err}` }
      }

      const data = await res.json()
      return {
        success: true,
        platformPostId: data.id,
        url: `https://www.facebook.com/${data.id}`,
      }
    } catch (error) {
      return { success: false, error: `Facebook publish error: ${(error as Error).message}` }
    }
  }

  private async publishWithMedia(
    pageId: string,
    pageAccessToken: string,
    post: PublishRequest
  ): Promise<PublishResult> {
    // Upload photo
    const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: post.mediaUrls![0],
        caption: post.content,
        access_token: pageAccessToken,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: `Facebook photo upload error: ${err}` }
    }

    const data = await res.json()
    return {
      success: true,
      platformPostId: data.id || data.post_id,
      url: `https://www.facebook.com/${data.post_id || data.id}`,
    }
  }
}
