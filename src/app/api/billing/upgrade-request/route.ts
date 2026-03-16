import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const { data: client } = await supabase.from('clients').select('id, company_name').eq('user_id', user.id).single()
    if (!client) return NextResponse.json({ error: 'Client non trouve' }, { status: 404 })

    const body = await request.json()
    const { target_plan_id, message } = body

    if (!target_plan_id) return NextResponse.json({ error: 'target_plan_id requis' }, { status: 400 })

    // Get target plan
    const { data: targetPlan } = await supabase.from('billing_plans').select('*').eq('id', target_plan_id).single()
    if (!targetPlan) return NextResponse.json({ error: 'Plan non trouve' }, { status: 404 })

    // Create a pending action for admin review
    const { error: insertErr } = await supabase.from('pending_actions').insert({
      agent_id: '00000000-0000-0000-0000-000000000000',
      client_id: client.id,
      action_type: 'plan_upgrade',
      title: `Demande upgrade vers ${targetPlan.display_name}`,
      description: message || `${client.company_name} souhaite passer au plan ${targetPlan.display_name} (${targetPlan.price_monthly}€/mois)`,
      payload: {
        current_plan: null,
        target_plan_id: targetPlan.id,
        target_plan_name: targetPlan.name,
        target_plan_price: targetPlan.price_monthly,
      },
      status: 'pending',
    })

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Demande d\'upgrade envoyee a l\'administrateur' })
  } catch (error) {
    console.error('Upgrade request error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
