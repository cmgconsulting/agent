import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'

export const dynamic = 'force-dynamic'
// Default values returned when no roi_config exists yet
const DEFAULT_HOURLY_COST_EUROS = 45
const DEFAULT_CURRENCY = 'EUR'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Rate limiting
    const rl = checkRateLimit(`roi-config-get:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    // Fetch client record
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const clientId = client.id

    // Fetch existing roi_config
    const { data: roiConfig } = await supabase
      .from('roi_config')
      .select('*')
      .eq('client_id', clientId)
      .single()

    if (!roiConfig) {
      // Return default values — no config saved yet
      return NextResponse.json({
        client_id: clientId,
        hourly_cost_euros: DEFAULT_HOURLY_COST_EUROS,
        currency: DEFAULT_CURRENCY,
        is_default: true,
      })
    }

    return NextResponse.json({ ...roiConfig, is_default: false })
  } catch (err) {
    console.error('[analytics/roi/config GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Rate limiting
    const rl = checkRateLimit(`roi-config-put:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    // Fetch client record
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const clientId = client.id

    // Parse and validate body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requete invalide' }, { status: 400 })
    }

    const { hourly_cost_euros, currency } = body as {
      hourly_cost_euros?: unknown
      currency?: unknown
    }

    // Validate hourly_cost_euros
    if (hourly_cost_euros === undefined || hourly_cost_euros === null) {
      return NextResponse.json({ error: 'Le champ hourly_cost_euros est requis' }, { status: 400 })
    }

    const parsedCost = Number(hourly_cost_euros)
    if (!isFinite(parsedCost) || parsedCost <= 0) {
      return NextResponse.json(
        { error: 'Le cout horaire doit etre un nombre strictement positif' },
        { status: 400 }
      )
    }

    // Validate currency if provided
    const resolvedCurrency = typeof currency === 'string' && currency.trim().length > 0
      ? currency.trim().toUpperCase()
      : DEFAULT_CURRENCY

    // Upsert using service role to bypass RLS
    const serviceClient = createServiceRoleClient()

    const { data: upserted, error: upsertError } = await serviceClient
      .from('roi_config')
      .upsert(
        {
          client_id: clientId,
          hourly_cost_euros: parsedCost,
          currency: resolvedCurrency,
        },
        { onConflict: 'client_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[analytics/roi/config PUT] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde de la configuration' }, { status: 500 })
    }

    return NextResponse.json({ success: true, config: upserted })
  } catch (err) {
    console.error('[analytics/roi/config PUT] Unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
