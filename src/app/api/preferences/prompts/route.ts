import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET — Récupérer le prompt personnalisé d'un agent
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
  if (!agentType) return NextResponse.json({ error: 'agent_type requis' }, { status: 400 })

  const { data: prompt } = await supabase
    .from('client_agent_prompts')
    .select('*')
    .eq('client_id', client.id)
    .eq('agent_type', agentType)
    .single()

  return NextResponse.json({ prompt: prompt || null })
}

// POST — Créer ou mettre à jour le prompt personnalisé
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
  const { agent_type, custom_prompt, replace_default = false } = body

  if (!agent_type) return NextResponse.json({ error: 'agent_type requis' }, { status: 400 })

  const { data: prompt, error } = await supabase
    .from('client_agent_prompts')
    .upsert({
      client_id: client.id,
      agent_type,
      custom_prompt: custom_prompt || '',
      replace_default,
    }, {
      onConflict: 'client_id,agent_type',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ prompt })
}
