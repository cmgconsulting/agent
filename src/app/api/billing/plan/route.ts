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

    const { data: subscription } = await supabase
      .from('client_subscriptions')
      .select('*, billing_plans:plan_id(*)')
      .eq('client_id', client.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ subscription: null, message: 'Aucun abonnement actif' })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Billing plan error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
