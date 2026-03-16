import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { alertId: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.is_read === 'boolean') updates.is_read = body.is_read
    if (typeof body.is_dismissed === 'boolean') updates.is_dismissed = body.is_dismissed
    if (body.is_dismissed || body.is_read) updates.actioned_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('billing_alerts')
      .update(updates)
      .eq('id', params.alertId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('Update alert error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
