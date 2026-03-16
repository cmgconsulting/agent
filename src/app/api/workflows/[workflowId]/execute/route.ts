import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS, isValidUUID } from '@/lib/security'
import { executeWorkflow } from '@/lib/workflows/engine'

// ============================================
// POST — Create execution record and fire-and-forget
// Returns { execution_id } immediately with 202 status
// ============================================

export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params

    if (!isValidUUID(workflowId)) {
      return NextResponse.json({ error: 'Identifiant de workflow invalide' }, { status: 400 })
    }

    // Rate limit per user (agent run limit — workflow executions are expensive)
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`workflow-exec:${user.id}`, RATE_LIMITS.agentRun)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) },
        }
      )
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Verify workflow belongs to this client and is active
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('id, status')
      .eq('id', workflowId)
      .eq('client_id', client.id)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 })
    }

    if (workflow.status === 'paused') {
      return NextResponse.json({ error: 'Ce workflow est en pause' }, { status: 409 })
    }

    // Parse optional trigger_data from body
    let triggerData: Record<string, unknown> = {}
    try {
      const body = await request.json()
      if (body?.trigger_data && typeof body.trigger_data === 'object') {
        triggerData = body.trigger_data
      }
    } catch {
      // Body is optional — ignore parse errors
    }

    // Create execution record
    const adminClient = createServiceRoleClient()

    const { data: execution, error: execError } = await adminClient
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        client_id: client.id,
        status: 'running',
        trigger_data: triggerData,
        started_at: new Date().toISOString(),
        completed_at: null,
        error: null,
      })
      .select('id')
      .single()

    if (execError || !execution) {
      console.error('[workflows/execute POST] Insert execution error:', execError)
      return NextResponse.json({ error: 'Erreur lors de la creation de l\'execution' }, { status: 500 })
    }

    // Fire-and-forget: run workflow asynchronously after returning
    // We use Promise.resolve().then() to defer execution past the response.
    Promise.resolve().then(() =>
      executeWorkflow(execution.id, workflowId, triggerData)
        .catch((err) => {
          console.error(`[workflow engine] Unhandled error for execution ${execution.id}:`, err)
        })
    )

    return NextResponse.json({ execution_id: execution.id }, { status: 202 })
  } catch (err) {
    console.error('[workflows/execute POST] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
