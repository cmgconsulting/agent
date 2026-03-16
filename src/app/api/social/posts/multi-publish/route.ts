import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString } from '@/lib/security'
import { getPublisher } from '@/lib/social/publishers/factory'
import type { SocialPlatform, SocialAccount } from '@/types/database'

/**
 * POST /api/social/posts/multi-publish
 * Publish content across multiple platforms simultaneously.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`social-multi:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })

    const body = await request.json()
    const { content, account_ids, media_urls, post_type, campaign_id } = body

    if (!content || !account_ids?.length) {
      return NextResponse.json({ error: 'Contenu et comptes requis' }, { status: 400 })
    }

    // Get accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .in('id', account_ids)
      .eq('status', 'active')

    if (accountsError || !accounts?.length) {
      return NextResponse.json({ error: 'Aucun compte actif trouve' }, { status: 404 })
    }

    // Publish in parallel
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        const platform = account.platform as SocialPlatform

        // Create post record
        const { data: post } = await supabase
          .from('social_posts')
          .insert({
            client_id: profile.client_id,
            social_account_id: account.id,
            platform,
            content: sanitizeString(content),
            media_urls: media_urls || [],
            post_type: post_type || 'text',
            status: 'publishing',
            campaign_id: campaign_id || null,
            created_by: user.id,
          })
          .select()
          .single()

        if (!post) throw new Error(`Failed to create post record for ${platform}`)

        // Publish
        const publisher = getPublisher(platform)
        const result = await publisher.publish(account as unknown as SocialAccount, {
          content: sanitizeString(content),
          mediaUrls: media_urls || [],
          postType: post_type || 'text',
        })

        // Update post status
        await supabase
          .from('social_posts')
          .update({
            status: result.success ? 'published' : 'failed',
            platform_post_id: result.platformPostId || null,
            published_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null,
          })
          .eq('id', post.id)

        return { platform, postId: post.id, ...result }
      })
    )

    const publishResults = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return { platform: accounts[i].platform, success: false, error: (r.reason as Error).message }
    })

    return NextResponse.json({ results: publishResults })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
