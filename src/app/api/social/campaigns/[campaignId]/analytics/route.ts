import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security'

export const dynamic = 'force-dynamic'
/**
 * GET /api/social/campaigns/[campaignId]/analytics
 * Get aggregated analytics for a campaign.
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

    // Get campaign posts with engagement data
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('platform, engagement, status, published_at')
      .eq('campaign_id', campaignId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Aggregate metrics
    const summary = {
      total_posts: posts?.length || 0,
      published: posts?.filter(p => p.status === 'published').length || 0,
      total_impressions: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_clicks: 0,
      by_platform: {} as Record<string, { posts: number; impressions: number; engagement: number }>,
    }

    for (const post of posts || []) {
      const eng = (post.engagement || {}) as Record<string, number>
      summary.total_impressions += eng.impressions || 0
      summary.total_likes += eng.likes || 0
      summary.total_comments += eng.comments || 0
      summary.total_shares += eng.shares || 0
      summary.total_clicks += eng.clicks || 0

      if (!summary.by_platform[post.platform]) {
        summary.by_platform[post.platform] = { posts: 0, impressions: 0, engagement: 0 }
      }
      summary.by_platform[post.platform].posts++
      summary.by_platform[post.platform].impressions += eng.impressions || 0
      summary.by_platform[post.platform].engagement += (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0)
    }

    return NextResponse.json({ analytics: summary })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
