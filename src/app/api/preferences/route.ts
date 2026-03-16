import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET — Récupérer les préférences du client connecté
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

  const agentType = req.nextUrl.searchParams.get('agent_type')

  let query = supabase
    .from('client_preferences')
    .select('*')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (agentType) {
    query = query.or(`agent_type.eq.${agentType},agent_type.eq.global`)
  }

  const { data: preferences, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ preferences })
}

// POST — Créer ou mettre à jour une préférence
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

  const body = await req.json()
  const { agent_type, preference_key, preference_value, source = 'user' } = body

  if (!agent_type || !preference_key || !preference_value) {
    return NextResponse.json({ error: 'Champs requis: agent_type, preference_key, preference_value' }, { status: 400 })
  }

  // Upsert — si la clé existe déjà, mettre à jour
  const { data: pref, error } = await supabase
    .from('client_preferences')
    .upsert({
      client_id: client.id,
      agent_type,
      preference_key,
      preference_value,
      source,
      is_active: true,
    }, {
      onConflict: 'client_id,agent_type,preference_key',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ preference: pref })
}

// DELETE — Désactiver une préférence
export async function DELETE(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

  const body = await req.json()
  const { preference_id } = body

  if (!preference_id) {
    return NextResponse.json({ error: 'preference_id requis' }, { status: 400 })
  }

  const { error } = await supabase
    .from('client_preferences')
    .update({ is_active: false })
    .eq('id', preference_id)
    .eq('client_id', client.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
