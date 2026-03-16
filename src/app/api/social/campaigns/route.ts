import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString } from '@/lib/security'

/**
 * GET /api/social/campaigns
 * List campaigns for the current client.
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    let query = supabase
      .from('social_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: campaigns, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/social/campaigns
 * Create a new campaign.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`social-campaign:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })

    const body = await request.json()

    const campaignData = {
      client_id: profile.client_id,
      name: sanitizeString(body.name),
      description: body.description ? sanitizeString(body.description) : null,
      platforms: body.platforms || [],
      objective: body.objective || null,
      status: 'draft',
      budget_total: body.budget_total || null,
      budget_daily: body.budget_daily || null,
      currency: body.currency || 'EUR',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      target_audience: body.target_audience || {},
      created_by: user.id,
    }

    const { data: campaign, error } = await supabase
      .from('social_campaigns')
      .insert(campaignData)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
