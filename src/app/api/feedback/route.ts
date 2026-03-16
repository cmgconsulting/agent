import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
// POST — Enregistrer un feedback d'insatisfaction
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
  const {
    agent_type,
    user_message,
    agent_response,
    dissatisfaction_message,
    resolution_type,
    preference_created_id = null,
  } = body

  if (!agent_type || !user_message || !agent_response || !dissatisfaction_message || !resolution_type) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const { data: feedback, error } = await supabase
    .from('feedback_history')
    .insert({
      client_id: client.id,
      agent_type,
      user_message,
      agent_response,
      dissatisfaction_message,
      resolution_type,
      preference_created_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ feedback })
}

// GET — Récupérer l'historique des feedbacks (pour admin ou page préférences)
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

  // Admin voit tout, client voit les siens
  if (profile?.role === 'admin') {
    const clientId = req.nextUrl.searchParams.get('client_id')
    let query = supabase
      .from('feedback_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedbacks: data })
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

  const { data, error } = await supabase
    .from('feedback_history')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedbacks: data })
}
