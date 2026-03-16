import { decryptCredentials } from '@/lib/vault'
import type { SocialAccount } from '@/types/database'
import type { SocialPublisher, PublishRequest, PublishResult } from './types'

export class InstagramPublisher implements SocialPublisher {
  async publish(account: SocialAccount, post: PublishRequest): Promise<PublishResult> {
    try {
      if (!account.access_token_encrypted) {
        return { success: false, error: 'Token d\'acces manquant' }
      }
      const { token: accessToken } = decryptCredentials(account.access_token_encrypted)
      const igUserId = account.platform_user_id

      if (!igUserId) {
        return { success: false, error: 'Compte Instagram Business non trouve' }
      }

      // Instagram requires media — text-only posts are not supported
      if (!post.mediaUrls?.length) {
        return { success: false, error: 'Instagram requiert au moins une image ou video' }
      }

      if (post.postType === 'carousel' && post.mediaUrls.length > 1) {
        return this.publishCarousel(igUserId, accessToken, post)
      }

      // Step 1: Create media container
      const mediaType = post.postType === 'video' || post.postType === 'reel' ? 'VIDEO' : 'IMAGE'
      const containerParams: Record<string, string> = {
        access_token: accessToken,
        caption: post.content || '',
      }

      if (mediaType === 'VIDEO') {
        containerParams.media_type = post.postType === 'reel' ? 'REELS' : 'VIDEO'
        containerParams.video_url = post.mediaUrls[0]
      } else {
        containerParams.image_url = post.mediaUrls[0]
      }

      const containerRes = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(containerParams),
        }
      )

      if (!containerRes.ok) {
        const err = await containerRes.text()
        return { success: false, error: `Instagram container error: ${err}` }
      }

      const container = await containerRes.json()

      // For videos, wait for processing
      if (mediaType === 'VIDEO') {
        await this.waitForMediaReady(container.id, accessToken)
      }

      // Step 2: Publish container
      const publishRes = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: accessToken,
          }),
        }
      )

      if (!publishRes.ok) {
        const err = await publishRes.text()
        return { success: false, error: `Instagram publish error: ${err}` }
      }

      const data = await publishRes.json()
      return {
        success: true,
        platformPostId: data.id,
        url: `https://www.instagram.com/p/${data.id}/`,
      }
    } catch (error) {
      return { success: false, error: `Instagram publish error: ${(error as Error).message}` }
    }
  }

  private async publishCarousel(
    igUserId: string,
    accessToken: string,
    post: PublishRequest
  ): Promise<PublishResult> {
    // Create individual media containers
    const childIds: string[] = []
    for (const mediaUrl of post.mediaUrls!) {
      const res = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: mediaUrl,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      childIds.push(data.id)
    }

    // Create carousel container
    const carouselRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childIds,
        caption: post.content || '',
        access_token: accessToken,
      }),
    })

    if (!carouselRes.ok) {
      const err = await carouselRes.text()
      return { success: false, error: `Instagram carousel error: ${err}` }
    }

    const carousel = await carouselRes.json()

    // Publish carousel
    const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: carousel.id,
        access_token: accessToken,
      }),
    })

    if (!publishRes.ok) {
      const err = await publishRes.text()
      return { success: false, error: `Instagram carousel publish error: ${err}` }
    }

    const data = await publishRes.json()
    return { success: true, platformPostId: data.id }
  }

  private async waitForMediaReady(containerId: string, accessToken: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.status_code === 'FINISHED') return
        if (data.status_code === 'ERROR') throw new Error('Media processing failed')
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    throw new Error('Media processing timeout')
  }
}
