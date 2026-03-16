import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID, checkRateLimit, RATE_LIMITS } from '@/lib/security'

/**
 * POST /api/social/campaigns/[campaignId]/launch
 * Launch a campaign (change status to active).
 */
export async function POST(
  _request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params
    if (!isValidUUID(campaignId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`campaign-launch:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    // Get campaign
    const { data: campaign, error: getError } = await supabase
      .from('social_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (getError || !campaign) return NextResponse.json({ error: 'Campagne non trouvee' }, { status: 404 })

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      return NextResponse.json({ error: 'Seules les campagnes draft/paused peuvent etre lancees' }, { status: 400 })
    }

    // Update status
    const { data: updated, error } = await supabase
      .from('social_campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ campaign: updated })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
