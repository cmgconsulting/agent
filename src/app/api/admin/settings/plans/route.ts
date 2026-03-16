import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET all billing plans
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans: data })
}

// PUT update a billing plan
export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('billing_plans')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log audit
  await supabase.from('admin_sessions_log').insert({
    user_id: user.id,
    action: 'plan.update',
    details: { plan_id: id, plan_name: data?.name, fields_updated: Object.keys(fields) },
  })

  return NextResponse.json({ plan: data })
}

// POST create a new billing plan
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('billing_plans')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_sessions_log').insert({
    user_id: user.id,
    action: 'plan.create',
    details: { plan_name: data?.name },
  })

  return NextResponse.json({ plan: data })
}
