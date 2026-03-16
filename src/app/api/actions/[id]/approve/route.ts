import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notifyClient } from '@/lib/notifications'
import { executeAction } from '@/lib/action-executor'

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

  // Get the action details before updating
  const { data: action } = await supabase
    .from('pending_actions')
    .select('*, agents(name, type)')
    .eq('id', params.id)
    .single()

  if (!action) {
    return NextResponse.json({ error: 'Action non trouvee' }, { status: 404 })
  }

  const { error } = await supabase
    .from('pending_actions')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Log the approval
  await supabase.from('agent_logs').insert({
    agent_id: action.agent_id,
    client_id: action.client_id,
    action: `Action approuvee: ${action.title}`,
    status: 'success',
    payload_summary: `Approuve par ${user.email}`,
    tokens_used: 0,
    duration_ms: 0,
  })

  // Execute the action via connector
  const execResult = await executeAction({
    id: action.id,
    agent_id: action.agent_id,
    client_id: action.client_id,
    action_type: action.action_type,
    title: action.title,
    payload: action.payload as Record<string, unknown> || {},
  })

  // Update status based on execution result
  await supabase
    .from('pending_actions')
    .update({
      status: execResult.success ? 'executed' : 'failed',
      executed_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  // Log execution result
  await supabase.from('agent_logs').insert({
    agent_id: action.agent_id,
    client_id: action.client_id,
    action: execResult.success
      ? `Action executee: ${action.title}`
      : `Echec execution: ${action.title}`,
    status: execResult.success ? 'success' : 'error',
    payload_summary: execResult.result || execResult.error || '',
    tokens_used: 0,
    duration_ms: 0,
  })

  // Send notification
  const agentData = action.agents as Record<string, unknown> | null
  try {
    await notifyClient({
      clientId: action.client_id,
      title: execResult.success
        ? `Action executee: ${action.title}`
        : `Echec: ${action.title}`,
      message: execResult.success
        ? `L'action "${action.title}" a ete approuvee et executee. ${execResult.result || ''}`
        : `L'action "${action.title}" a echoue: ${execResult.error || 'Erreur inconnue'}`,
      type: 'action_executed',
      agentName: (agentData?.name as string) || undefined,
    })
  } catch {
    // Non-blocking
  }

  // Return JSON for client-side calls (not redirect)
  const acceptHeader = request.headers.get('accept') || ''
  if (acceptHeader.includes('application/json')) {
    return NextResponse.json({
      success: execResult.success,
      status: execResult.success ? 'executed' : 'failed',
      result: execResult.result,
      error: execResult.error,
    })
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
