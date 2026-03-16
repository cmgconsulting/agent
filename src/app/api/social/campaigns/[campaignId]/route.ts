import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID, sanitizeString } from '@/lib/security'

export const dynamic = 'force-dynamic'
/**
 * GET /api/social/campaigns/[campaignId]
 */
export async function GET(
  _request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params
    if (!isValidUUID(campaignId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: campaign, error } = await supabase
      .from('social_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (error || !campaign) return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 })

    // Get associated posts
    const { data: posts } = await supabase
      .from('social_posts')
      .select('id, platform, content, status, published_at, engagement')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    return NextResponse.json({ campaign, posts: posts || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PUT /api/social/campaigns/[campaignId]
 */
export async function PUT(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params
    if (!isValidUUID(campaignId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const body = await request.json()
    const updatePayload: Record<string, unknown> = {}

    if (body.name) updatePayload.name = sanitizeString(body.name)
    if (body.description !== undefined) updatePayload.description = body.description ? sanitizeString(body.description) : null
    if (body.platforms) updatePayload.platforms = body.platforms
    if (body.objective) updatePayload.objective = body.objective
    if (body.status) updatePayload.status = body.status
    if (body.budget_total !== undefined) updatePayload.budget_total = body.budget_total
    if (body.budget_daily !== undefined) updatePayload.budget_daily = body.budget_daily
    if (body.start_date !== undefined) updatePayload.start_date = body.start_date
    if (body.end_date !== undefined) updatePayload.end_date = body.end_date
    if (body.target_audience) updatePayload.target_audience = body.target_audience

    const { data: campaign, error } = await supabase
      .from('social_campaigns')
      .update(updatePayload)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ campaign })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/social/campaigns/[campaignId]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params
    if (!isValidUUID(campaignId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { error } = await supabase
      .from('social_campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
