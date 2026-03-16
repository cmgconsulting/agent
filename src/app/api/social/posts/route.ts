import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString } from '@/lib/security'

/**
 * GET /api/social/posts
 * List posts for the current client with optional filters.
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const url = new URL(request.url)
    const platform = url.searchParams.get('platform')
    const status = url.searchParams.get('status')
    const campaignId = url.searchParams.get('campaign_id')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)

    let query = supabase
      .from('social_posts')
      .select('*, social_accounts(platform, display_name, platform_username)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (platform) query = query.eq('platform', platform)
    if (status) query = query.eq('status', status)
    if (campaignId) query = query.eq('campaign_id', campaignId)

    const { data: posts, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ posts: posts || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/social/posts
 * Create a new post (draft or immediate publish).
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`social-post:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })

    const body = await request.json()
    const { social_account_id, platform, content, media_urls, post_type, scheduled_at, campaign_id, ai_generated, ai_prompt } = body

    if (!platform || !content) {
      return NextResponse.json({ error: 'Plateforme et contenu requis' }, { status: 400 })
    }

    const postData = {
      client_id: profile.client_id,
      social_account_id: social_account_id || null,
      platform,
      content: sanitizeString(content),
      media_urls: media_urls || [],
      post_type: post_type || 'text',
      status: scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: scheduled_at || null,
      campaign_id: campaign_id || null,
      ai_generated: ai_generated || false,
      ai_prompt: ai_prompt ? sanitizeString(ai_prompt) : null,
      created_by: user.id,
    }

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert(postData)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
