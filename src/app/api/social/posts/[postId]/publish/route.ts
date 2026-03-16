import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID, checkRateLimit, RATE_LIMITS } from '@/lib/security'
import { getPublisher } from '@/lib/social/publishers/factory'
import type { SocialPlatform, SocialAccount } from '@/types/database'

/**
 * POST /api/social/posts/[postId]/publish
 * Publish a draft post to its platform.
 */
export async function POST(
  _request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params
    if (!isValidUUID(postId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`social-publish:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    // Get post
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (postError || !post) return NextResponse.json({ error: 'Post non trouve' }, { status: 404 })

    if (post.status === 'published') {
      return NextResponse.json({ error: 'Post deja publie' }, { status: 400 })
    }

    if (!post.social_account_id) {
      return NextResponse.json({ error: 'Aucun compte social associe' }, { status: 400 })
    }

    // Get social account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', post.social_account_id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Compte social non trouve' }, { status: 404 })
    }

    if (account.status !== 'active') {
      return NextResponse.json({ error: 'Compte social inactif ou expire' }, { status: 400 })
    }

    // Update status to publishing
    await supabase
      .from('social_posts')
      .update({ status: 'publishing' })
      .eq('id', postId)

    // Publish via platform publisher
    const publisher = getPublisher(post.platform as SocialPlatform)
    const result = await publisher.publish(account as unknown as SocialAccount, {
      content: post.content || '',
      mediaUrls: post.media_urls || [],
      postType: post.post_type,
    })

    if (result.success) {
      await supabase
        .from('social_posts')
        .update({
          status: 'published',
          platform_post_id: result.platformPostId,
          published_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', postId)

      return NextResponse.json({ success: true, platformPostId: result.platformPostId, url: result.url })
    } else {
      await supabase
        .from('social_posts')
        .update({
          status: 'failed',
          error_message: result.error,
        })
        .eq('id', postId)

      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: `Erreur publication: ${(error as Error).message}` }, { status: 500 })
  }
}
