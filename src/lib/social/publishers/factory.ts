import type { SocialPlatform } from '@/types/database'
import type { SocialPublisher } from './types'
import { FacebookPublisher } from './facebook'
import { InstagramPublisher } from './instagram'
import { LinkedInPublisher } from './linkedin'
import { TwitterPublisher } from './twitter'
import { TikTokPublisher } from './tiktok'

const publishers: Partial<Record<SocialPlatform, SocialPublisher>> = {
  facebook: new FacebookPublisher(),
  instagram: new InstagramPublisher(),
  linkedin: new LinkedInPublisher(),
  twitter: new TwitterPublisher(),
  tiktok: new TikTokPublisher(),
}

export function getPublisher(platform: SocialPlatform): SocialPublisher {
  const publisher = publishers[platform]
  if (!publisher) {
    throw new Error(`Publication non supportee pour la plateforme: ${platform}`)
  }
  return publisher
}
