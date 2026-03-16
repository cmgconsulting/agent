import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'
import type { PreferredTone, PreferredLength } from '@/types/database'

const VALID_TONES: PreferredTone[]   = ['formel', 'decontracte', 'technique']
const VALID_LENGTHS: PreferredLength[] = ['concis', 'detaille', 'exhaustif']

// Default preferences returned when none exist yet
const DEFAULT_PREFERENCES = {
  preferred_tone: 'formel' as PreferredTone,
  preferred_length: 'detaille' as PreferredLength,
  custom_instructions: null,
  good_examples: [] as string[],
}

// ============================================
// GET — Return client_preferences for agent, or defaults
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params

    if (!isValidUUID(agentId)) {
      return NextResponse.json({ error: 'Identifiant d\'agent invalide' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Verify agent belongs to this client
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, type')
      .eq('id', agentId)
      .eq('client_id', client.id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }

    const { data: preferences } = await supabase
      .from('client_preferences')
      .select('*')
      .eq('client_id', client.id)
      .eq('agent_id', agentId)
      .single()

    if (!preferences) {
      // Return default values — not an error, just no preferences set yet
      return NextResponse.json({
        preferences: {
          ...DEFAULT_PREFERENCES,
          client_id: client.id,
          agent_id: agentId,
          id: null,
          updated_at: null,
        },
        is_default: true,
      })
    }

    return NextResponse.json({ preferences, is_default: false })
  } catch (err) {
    console.error('[agents/preferences GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// PUT — Upsert client_preferences for agent
// Body: { preferred_tone, preferred_length, custom_instructions?, good_examples? }
// ============================================

export async function PUT(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params

    if (!isValidUUID(agentId)) {
      return NextResponse.json({ error: 'Identifiant d\'agent invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('agents-preferences-put', RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requetes. Reessayez plus tard.' }, { status: 429 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Verify agent belongs to this client
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('client_id', client.id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }

    const body = await request.json()

    // Validate preferred_tone
    if (!body.preferred_tone) {
      return NextResponse.json({ error: 'Le champ \'preferred_tone\' est requis' }, { status: 400 })
    }
    if (!VALID_TONES.includes(body.preferred_tone as PreferredTone)) {
      return NextResponse.json(
        { error: `Ton invalide. Valeurs acceptees : ${VALID_TONES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate preferred_length
    if (!body.preferred_length) {
      return NextResponse.json({ error: 'Le champ \'preferred_length\' est requis' }, { status: 400 })
    }
    if (!VALID_LENGTHS.includes(body.preferred_length as PreferredLength)) {
      return NextResponse.json(
        { error: `Longueur invalide. Valeurs acceptees : ${VALID_LENGTHS.join(', ')}` },
        { status: 400 }
      )
    }

    const preferred_tone: PreferredTone     = body.preferred_tone
    const preferred_length: PreferredLength = body.preferred_length
    const custom_instructions: string | null = body.custom_instructions
      ? sanitizeString(body.custom_instructions, 5000) || null
      : null
    const good_examples: string[] = Array.isArray(body.good_examples)
      ? body.good_examples
          .filter((ex: unknown) => typeof ex === 'string')
          .map((ex: string) => sanitizeString(ex, 2000))
          .filter(Boolean)
      : []

    const adminClient = createServiceRoleClient()

    // Upsert: update if exists, insert if not
    const { data: preferences, error: upsertError } = await adminClient
      .from('client_preferences')
      .upsert(
        {
          client_id: client.id,
          agent_id: agentId,
          preferred_tone,
          preferred_length,
          custom_instructions,
          good_examples,
        },
        { onConflict: 'client_id,agent_id' }
      )
      .select()
      .single()

    if (upsertError || !preferences) {
      console.error('[agents/preferences PUT] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde des preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences })
  } catch (err) {
    console.error('[agents/preferences PUT] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
