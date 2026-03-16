import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'
import type {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowOnError,
} from '@/types/database'

const VALID_STATUSES: WorkflowStatus[] = ['draft', 'active', 'paused']
const VALID_TRIGGER_TYPES: WorkflowTriggerType[] = ['manual', 'schedule', 'event', 'webhook']
const VALID_ON_ERROR: WorkflowOnError[] = ['stop', 'skip', 'retry']

// ============================================
// GET — Workflow detail with steps + agent info
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

    // Fetch workflow (ownership enforced via client_id)
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('client_id', client.id)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 })
    }

    // Fetch steps with agent info, ordered by step_order
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
      console.error('[workflows/[id] GET] Steps error:', stepsError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des etapes' }, { status: 500 })
    }

    return NextResponse.json({ workflow, steps: steps || [] })
  } catch (err) {
    console.error('[workflows/[id] GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// PUT — Update workflow fields + replace steps
// ============================================

export async function PUT(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params

    if (!isValidUUID(workflowId)) {
      return NextResponse.json({ error: 'Identifiant de workflow invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('workflows-put', RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requetes. Reessayez plus tard.' }, { status: 429 })
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

    // Verify ownership before update
    const { data: existing, error: existingError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('client_id', client.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 })
    }

    const body = await request.json()

    // Validate steps if provided
    if (body.steps !== undefined) {
      if (!Array.isArray(body.steps) || body.steps.length === 0) {
        return NextResponse.json(
          { error: 'Le champ \'steps\' doit etre un tableau avec au moins une etape' },
          { status: 400 }
        )
      }
      for (let i = 0; i < body.steps.length; i++) {
        const step = body.steps[i]
        if (typeof step.step_order !== 'number') {
          return NextResponse.json(
            { error: `L'etape ${i + 1} doit avoir un champ 'step_order' numerique` },
            { status: 400 }
          )
        }
        if (!step.agent_id) {
          return NextResponse.json(
            { error: `L'etape ${i + 1} doit avoir un 'agent_id'` },
            { status: 400 }
          )
        }
        if (!step.prompt_template) {
          return NextResponse.json(
            { error: `L'etape ${i + 1} doit avoir un 'prompt_template'` },
            { status: 400 }
          )
        }
        if (step.on_error && !VALID_ON_ERROR.includes(step.on_error)) {
          return NextResponse.json(
            { error: `Valeur 'on_error' invalide pour l'etape ${i + 1}` },
            { status: 400 }
          )
        }
      }
    }

    const adminClient = createServiceRoleClient()

    // Build update payload (only include provided fields)
    const updatePayload: Record<string, unknown> = {}
    if (body.name !== undefined) updatePayload.name = sanitizeString(body.name, 200)
    if (body.description !== undefined) {
      updatePayload.description = body.description ? sanitizeString(body.description, 2000) : null
    }
    if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
      updatePayload.status = body.status
    }
    if (body.trigger_type !== undefined && VALID_TRIGGER_TYPES.includes(body.trigger_type)) {
      updatePayload.trigger_type = body.trigger_type
    }
    if (body.trigger_config !== undefined && typeof body.trigger_config === 'object') {
      updatePayload.trigger_config = body.trigger_config
    }

    // Update workflow fields
    const { data: workflow, error: updateError } = await adminClient
      .from('workflows')
      .update(updatePayload)
      .eq('id', workflowId)
      .select()
      .single()

    if (updateError || !workflow) {
      console.error('[workflows/[id] PUT] Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour du workflow' }, { status: 500 })
    }

    let steps = null

    if (body.steps !== undefined) {
      // Replace steps: delete old ones, insert new ones
      const { error: deleteError } = await adminClient
        .from('workflow_steps')
        .delete()
        .eq('workflow_id', workflowId)

      if (deleteError) {
        console.error('[workflows/[id] PUT] Delete steps error:', deleteError)
        return NextResponse.json({ error: 'Erreur lors de la suppression des etapes' }, { status: 500 })
      }

      const stepsToInsert = body.steps.map((step: {
        step_order: number
        agent_id: string
        prompt_template: string
        condition?: Record<string, unknown>
        timeout_seconds?: number
        on_error?: WorkflowOnError
      }) => ({
        workflow_id: workflowId,
        step_order: step.step_order,
        agent_id: step.agent_id,
        prompt_template: sanitizeString(step.prompt_template, 20000),
        condition: step.condition ?? null,
        timeout_seconds: typeof step.timeout_seconds === 'number' ? step.timeout_seconds : 60,
        on_error: VALID_ON_ERROR.includes(step.on_error as WorkflowOnError) ? step.on_error : 'stop',
      }))

      const { data: insertedSteps, error: insertError } = await adminClient
        .from('workflow_steps')
        .insert(stepsToInsert)
        .select()

      if (insertError) {
        console.error('[workflows/[id] PUT] Insert steps error:', insertError)
        return NextResponse.json({ error: 'Erreur lors de l\'insertion des etapes' }, { status: 500 })
      }

      steps = insertedSteps
    }

    return NextResponse.json({ workflow, steps })
  } catch (err) {
    console.error('[workflows/[id] PUT] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// DELETE — Delete workflow (cascades to steps/executions)
// ============================================

export async function DELETE(
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

    // Verify ownership
    const { data: existing } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('client_id', client.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 })
    }

    const adminClient = createServiceRoleClient()

    const { error: deleteError } = await adminClient
      .from('workflows')
      .delete()
      .eq('id', workflowId)

    if (deleteError) {
      console.error('[workflows/[id] DELETE] Error:', deleteError)
      return NextResponse.json({ error: 'Erreur lors de la suppression du workflow' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[workflows/[id] DELETE] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
