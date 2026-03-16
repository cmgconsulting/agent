import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  // Get the action details
  const { data: action } = await supabase
    .from('pending_actions')
    .select('*, agents(name)')
    .eq('id', params.id)
    .single()

  if (!action) {
    return NextResponse.json({ error: 'Action non trouvee' }, { status: 404 })
  }

  const { error } = await supabase
    .from('pending_actions')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Log the rejection
  await supabase.from('agent_logs').insert({
    agent_id: action.agent_id,
    client_id: action.client_id,
    action: `Action refusee: ${action.title}`,
    status: 'warning',
    payload_summary: `Refuse par ${user.email}`,
    tokens_used: 0,
    duration_ms: 0,
  })

  // Return JSON for client-side calls
  const acceptHeader = request.headers.get('accept') || ''
  if (acceptHeader.includes('application/json')) {
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
