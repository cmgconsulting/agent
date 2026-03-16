import type { SocialAccount } from '@/types/database'

export interface PublishRequest {
  content: string
  mediaUrls?: string[]
  postType: string
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  error?: string
  url?: string
}

export interface SocialPublisher {
  publish(account: SocialAccount, post: PublishRequest): Promise<PublishResult>
}
