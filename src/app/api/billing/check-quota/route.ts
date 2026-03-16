import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const body = await request.json()
    const clientId = body.client_id

    if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 })

    const { data, error } = await supabase.rpc('check_token_quota', { p_client_id: clientId })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Check quota error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
