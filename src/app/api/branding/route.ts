import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString } from '@/lib/security'
import type { BrandFont } from '@/types/database'

export const dynamic = 'force-dynamic'
// ============================================
// CONSTANTS
// ============================================

const ALLOWED_FONTS: BrandFont[] = ['Inter', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Poppins']

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

const DEFAULT_BRANDING = {
  logo_url: null,
  primary_color: '#2563EB',
  secondary_color: '#10B981',
  font_family: 'Inter' as BrandFont,
  slogan: null,
  address: null,
  phone: null,
  contact_email: null,
  website: null,
  legal_mentions: null,
  templates: {},
  is_default: true,
}

// ============================================
// GET — Return branding config for the client
// ============================================

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const { data: branding } = await supabase
      .from('client_branding_config')
      .select('*')
      .eq('client_id', client.id)
      .single()

    if (!branding) {
      return NextResponse.json({
        branding: { ...DEFAULT_BRANDING, client_id: client.id },
      })
    }

    return NextResponse.json({ branding: { ...branding, is_default: false } })
  } catch (err) {
    console.error('[branding] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// PUT — Upsert branding config
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    // Rate limit
    const rl = checkRateLimit(`branding:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requete JSON invalide' }, { status: 400 })
    }

    const {
      primary_color,
      secondary_color,
      font_family,
      slogan,
      address,
      phone,
      contact_email,
      website,
      legal_mentions,
    } = body

    // Validate hex colors
    if (primary_color !== undefined) {
      if (typeof primary_color !== 'string' || !HEX_COLOR_RE.test(primary_color)) {
        return NextResponse.json(
          { error: 'primary_color invalide. Format attendu: #RRGGBB ou #RGB' },
          { status: 400 }
        )
      }
    }
    if (secondary_color !== undefined) {
      if (typeof secondary_color !== 'string' || !HEX_COLOR_RE.test(secondary_color)) {
        return NextResponse.json(
          { error: 'secondary_color invalide. Format attendu: #RRGGBB ou #RGB' },
          { status: 400 }
        )
      }
    }

    // Validate font
    if (font_family !== undefined) {
      if (!ALLOWED_FONTS.includes(font_family as BrandFont)) {
        return NextResponse.json(
          { error: `font_family invalide. Polices acceptees: ${ALLOWED_FONTS.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build sanitized update payload
    const payload: Record<string, unknown> = {
      client_id: client.id,
    }

    if (primary_color !== undefined) payload.primary_color = primary_color
    if (secondary_color !== undefined) payload.secondary_color = secondary_color
    if (font_family !== undefined) payload.font_family = font_family
    if (slogan !== undefined) payload.slogan = slogan ? sanitizeString(String(slogan), 300) : null
    if (address !== undefined) payload.address = address ? sanitizeString(String(address), 500) : null
    if (phone !== undefined) payload.phone = phone ? sanitizeString(String(phone), 50) : null
    if (contact_email !== undefined) payload.contact_email = contact_email ? sanitizeString(String(contact_email), 254) : null
    if (website !== undefined) payload.website = website ? sanitizeString(String(website), 500) : null
    if (legal_mentions !== undefined) payload.legal_mentions = legal_mentions ? sanitizeString(String(legal_mentions), 5000) : null

    const adminClient = createServiceRoleClient()

    const { data: upserted, error: upsertError } = await adminClient
      .from('client_branding_config')
      .upsert(payload, { onConflict: 'client_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('[branding] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde de la personnalisation' }, { status: 500 })
    }

    return NextResponse.json({ branding: upserted, success: true })
  } catch (err) {
    console.error('[branding] PUT error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
