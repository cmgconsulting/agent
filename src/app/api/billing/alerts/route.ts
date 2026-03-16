import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).single()
    if (!client) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })

    const { data: alerts, error } = await supabase
      .from('billing_alerts')
      .select('*')
      .eq('client_id', client.id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ alerts: alerts || [] })
  } catch (error) {
    console.error('Billing alerts error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
