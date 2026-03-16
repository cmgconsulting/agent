import { decryptCredentials } from '@/lib/vault'
import type { SocialAccount } from '@/types/database'
import type { SocialPublisher, PublishRequest, PublishResult } from './types'

export class LinkedInPublisher implements SocialPublisher {
  async publish(account: SocialAccount, post: PublishRequest): Promise<PublishResult> {
    try {
      if (!account.access_token_encrypted) {
        return { success: false, error: 'Token d\'acces manquant' }
      }
      const { token: accessToken } = decryptCredentials(account.access_token_encrypted)
      const personUrn = `urn:li:person:${account.platform_user_id}`

      if (post.mediaUrls?.length) {
        return this.publishWithMedia(personUrn, accessToken, post)
      }

      // Text post via UGC Post API
      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.content },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, error: `LinkedIn API error: ${err}` }
      }

      const data = await res.json()
      const postId = data.id
      return {
        success: true,
        platformPostId: postId,
        url: `https://www.linkedin.com/feed/update/${postId}/`,
      }
    } catch (error) {
      return { success: false, error: `LinkedIn publish error: ${(error as Error).message}` }
    }
  }

  private async publishWithMedia(
    personUrn: string,
    accessToken: string,
    post: PublishRequest
  ): Promise<PublishResult> {
    // Register upload
    const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: personUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          }],
        },
      }),
    })

    if (!registerRes.ok) {
      const err = await registerRes.text()
      return { success: false, error: `LinkedIn register upload error: ${err}` }
    }

    const registerData = await registerRes.json()
    const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
    const asset = registerData.value?.asset

    if (!uploadUrl || !asset) {
      return { success: false, error: 'LinkedIn: impossible de recuperer l\'URL d\'upload' }
    }

    // Download and upload image
    const imageRes = await fetch(post.mediaUrls![0])
    const imageBuffer = await imageRes.arrayBuffer()

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    })

    if (!uploadRes.ok) {
      return { success: false, error: 'LinkedIn: echec upload image' }
    }

    // Create post with media
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: post.content },
            shareMediaCategory: 'IMAGE',
            media: [{
              status: 'READY',
              media: asset,
            }],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })

    if (!postRes.ok) {
      const err = await postRes.text()
      return { success: false, error: `LinkedIn post with media error: ${err}` }
    }

    const data = await postRes.json()
    return {
      success: true,
      platformPostId: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}/`,
    }
  }
}
