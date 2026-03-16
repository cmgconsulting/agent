import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID, sanitizeString } from '@/lib/security'

/**
 * GET /api/social/posts/[postId]
 */
export async function GET(
  _request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params
    if (!isValidUUID(postId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: post, error } = await supabase
      .from('social_posts')
      .select('*, social_accounts(platform, display_name, platform_username)')
      .eq('id', postId)
      .single()

    if (error || !post) return NextResponse.json({ error: 'Post non trouve' }, { status: 404 })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PUT /api/social/posts/[postId]
 */
export async function PUT(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params
    if (!isValidUUID(postId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const body = await request.json()
    const updatePayload: Record<string, unknown> = {}

    if (body.content !== undefined) updatePayload.content = body.content ? sanitizeString(body.content) : null
    if (body.media_urls !== undefined) updatePayload.media_urls = body.media_urls
    if (body.post_type !== undefined) updatePayload.post_type = body.post_type
    if (body.scheduled_at !== undefined) updatePayload.scheduled_at = body.scheduled_at
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.campaign_id !== undefined) updatePayload.campaign_id = body.campaign_id

    const { data: post, error } = await supabase
      .from('social_posts')
      .update(updatePayload)
      .eq('id', postId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/social/posts/[postId]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params
    if (!isValidUUID(postId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { error } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', postId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
