import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString, isValidUUID } from '@/lib/security'
import { calculateNextRun } from '@/lib/schedule-calculator'
import type { ScheduleType, ScheduleConfig } from '@/types/database'

/**
 * GET /api/scheduled-tasks/[taskId]
 * Get a specific scheduled task with its recent runs.
 */
export async function GET(
  _request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    if (!isValidUUID(taskId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: task, error } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error || !task) return NextResponse.json({ error: 'Tache non trouvee' }, { status: 404 })

    // Fetch recent runs
    const { data: runs } = await supabase
      .from('scheduled_task_runs')
      .select('*')
      .eq('task_id', taskId)
      .order('started_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ task, runs: runs || [] })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PUT /api/scheduled-tasks/[taskId]
 * Update a scheduled task.
 */
export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    if (!isValidUUID(taskId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`sched-update:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    const body = await request.json()
    const updatePayload: Record<string, unknown> = {}

    if (body.name) updatePayload.name = sanitizeString(body.name)
    if (body.description !== undefined) updatePayload.description = body.description ? sanitizeString(body.description) : null
    if (body.prompt !== undefined) updatePayload.prompt = body.prompt ? sanitizeString(body.prompt) : null
    if (body.active !== undefined) updatePayload.active = body.active

    // Schedule update: recalculate next_run_at
    if (body.schedule_type && body.schedule_config) {
      const config: ScheduleConfig = body.schedule_config
      const nextRunAt = calculateNextRun(body.schedule_type as ScheduleType, config)
      updatePayload.schedule_type = body.schedule_type
      updatePayload.schedule_config = config
      updatePayload.next_run_at = nextRunAt?.toISOString() ?? null
      updatePayload.cron_expression = body.schedule_type === 'cron' ? config.expression || null : null
      updatePayload.timezone = body.timezone || 'Europe/Paris'
    }

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ task: data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/scheduled-tasks/[taskId]
 * Delete a scheduled task.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    if (!isValidUUID(taskId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { error } = await supabase
      .from('scheduled_tasks')
      .delete()
      .eq('id', taskId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
