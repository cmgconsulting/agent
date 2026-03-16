import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security'

export const dynamic = 'force-dynamic'
// ============================================
// GET — List steps for a workflow, ordered by step_order, with agent info
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params

    if (!isValidUUID(workflowId)) {
      return NextResponse.json({ error: 'Identifiant de workflow invalide' }, { status: 400 })
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

    // Verify the workflow belongs to this client
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('client_id', client.id)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 })
    }

    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select(`
        id,
        workflow_id,
        step_order,
        agent_id,
        prompt_template,
        condition,
        timeout_seconds,
        on_error,
        created_at,
        updated_at,
        agents(id, type, name, active)
      `)
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true })

    if (stepsError) {
      console.error('[workflows/steps GET] Error:', stepsError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des etapes' }, { status: 500 })
    }

    return NextResponse.json({ steps: steps || [] })
  } catch (err) {
    console.error('[workflows/steps GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
