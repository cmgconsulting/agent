import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security'

// ============================================
// GET — Execution detail with all step results + agent info
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params

    if (!isValidUUID(executionId)) {
      return NextResponse.json({ error: 'Identifiant d\'execution invalide' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Fetch execution and verify ownership via client_id
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .select(`
        id,
        workflow_id,
        client_id,
        status,
        trigger_data,
        started_at,
        completed_at,
        error,
        workflows(id, name, description, status, trigger_type, trigger_config)
      `)
      .eq('id', executionId)
      .eq('client_id', client.id)
      .single()

    if (execError || !execution) {
      return NextResponse.json({ error: 'Execution introuvable' }, { status: 404 })
    }

    // Fetch all step results for this execution, with agent info
    const { data: stepResults, error: resultsError } = await supabase
      .from('workflow_step_results')
      .select(`
        id,
        execution_id,
        step_id,
        agent_id,
        input,
        output,
        status,
        duration_ms,
        tokens_used,
        started_at,
        completed_at,
        agents(id, type, name, active),
        workflow_steps(id, step_order, prompt_template, condition, timeout_seconds, on_error)
      `)
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true })

    if (resultsError) {
      console.error('[executions/[id] GET] Step results error:', resultsError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des resultats' }, { status: 500 })
    }

    return NextResponse.json({
      execution,
      step_results: stepResults || [],
    })
  } catch (err) {
    console.error('[executions/[id] GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
