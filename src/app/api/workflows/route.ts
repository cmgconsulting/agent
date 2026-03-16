import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  validateRequired,
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
// GET — List workflows for client (with step count)
// ============================================

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('workflows')
      .select(`
        id,
        name,
        description,
        status,
        trigger_type,
        trigger_config,
        created_by,
        created_at,
        updated_at,
        workflow_steps(count)
      `)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    if (status && VALID_STATUSES.includes(status as WorkflowStatus)) {
      query = query.eq('status', status)
    }

    const { data: workflows, error } = await query

    if (error) {
      console.error('[workflows GET] Supabase error:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des workflows' }, { status: 500 })
    }

    // Normalise: extract step count from the nested aggregate
    const normalized = (workflows || []).map((w) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stepCountRaw = (w as any).workflow_steps
      const steps_count = Array.isArray(stepCountRaw)
        ? (stepCountRaw[0]?.count ?? 0)
        : (stepCountRaw?.count ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { workflow_steps: _ignored, ...rest } = w as typeof w & { workflow_steps: unknown }
      return { ...rest, steps_count }
    })

    return NextResponse.json({ workflows: normalized })
  } catch (err) {
    console.error('[workflows GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// POST — Create workflow + steps atomically
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('workflows-post', RATE_LIMITS.api)
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

    const body = await request.json()

    // Validate required fields
    const missingError = validateRequired(body, ['name', 'steps'])
    if (missingError) return NextResponse.json({ error: missingError }, { status: 400 })

    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      return NextResponse.json(
        { error: 'Le champ \'steps\' doit etre un tableau avec au moins une etape' },
        { status: 400 }
      )
    }

    const name = sanitizeString(body.name, 200)
    if (!name) return NextResponse.json({ error: 'Nom de workflow invalide' }, { status: 400 })

    const description = body.description ? sanitizeString(body.description, 2000) : null
    const status: WorkflowStatus = VALID_STATUSES.includes(body.status) ? body.status : 'draft'
    const trigger_type: WorkflowTriggerType = VALID_TRIGGER_TYPES.includes(body.trigger_type)
      ? body.trigger_type
      : 'manual'
    const trigger_config =
      body.trigger_config && typeof body.trigger_config === 'object' ? body.trigger_config : {}

    // Validate steps
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
          { error: `Valeur 'on_error' invalide pour l'etape ${i + 1}. Valeurs acceptees: ${VALID_ON_ERROR.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const adminClient = createServiceRoleClient()

    // Create workflow
    const { data: workflow, error: workflowError } = await adminClient
      .from('workflows')
      .insert({
        client_id: client.id,
        name,
        description,
        status,
        trigger_type,
        trigger_config,
        created_by: user.id,
      })
      .select()
      .single()

    if (workflowError || !workflow) {
      console.error('[workflows POST] Insert workflow error:', workflowError)
      return NextResponse.json({ error: 'Erreur lors de la creation du workflow' }, { status: 500 })
    }

    // Create steps
    const stepsToInsert = body.steps.map((step: {
      step_order: number
      agent_id: string
      prompt_template: string
      condition?: Record<string, unknown>
      timeout_seconds?: number
      on_error?: WorkflowOnError
    }) => ({
      workflow_id: workflow.id,
      step_order: step.step_order,
      agent_id: step.agent_id,
      prompt_template: sanitizeString(step.prompt_template, 20000),
      condition: step.condition ?? null,
      timeout_seconds: typeof step.timeout_seconds === 'number' ? step.timeout_seconds : 60,
      on_error: VALID_ON_ERROR.includes(step.on_error as WorkflowOnError) ? step.on_error : 'stop',
    }))

    const { data: steps, error: stepsError } = await adminClient
      .from('workflow_steps')
      .insert(stepsToInsert)
      .select()

    if (stepsError) {
      console.error('[workflows POST] Insert steps error:', stepsError)
      // Rollback: delete the workflow we just created
      await adminClient.from('workflows').delete().eq('id', workflow.id)
      return NextResponse.json({ error: 'Erreur lors de la creation des etapes' }, { status: 500 })
    }

    return NextResponse.json({ workflow, steps }, { status: 201 })
  } catch (err) {
    console.error('[workflows POST] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
