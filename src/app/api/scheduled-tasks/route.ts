import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString, isValidUUID } from '@/lib/security'
import { calculateNextRun } from '@/lib/schedule-calculator'
import type { ScheduleType, ScheduleConfig } from '@/types/database'

/**
 * GET /api/scheduled-tasks
 * Lists scheduled tasks for the current client.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    if (!profile?.client_id) return NextResponse.json({ error: 'Pas de client associe' }, { status: 403 })

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ tasks: data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/scheduled-tasks
 * Creates a new scheduled task.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const rl = checkRateLimit(`sched-create:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    if (!profile?.client_id) return NextResponse.json({ error: 'Pas de client associe' }, { status: 403 })

    const body = await request.json()
    const {
      name,
      description,
      task_type,
      agent_id,
      workflow_id,
      prompt,
      schedule_type,
      schedule_config,
      timezone,
    } = body

    // Validation
    if (!name || !task_type || !schedule_type) {
      return NextResponse.json({ error: 'name, task_type et schedule_type requis' }, { status: 400 })
    }

    if (task_type === 'agent_run' && (!agent_id || !isValidUUID(agent_id))) {
      return NextResponse.json({ error: 'agent_id valide requis pour agent_run' }, { status: 400 })
    }
    if (task_type === 'workflow_run' && (!workflow_id || !isValidUUID(workflow_id))) {
      return NextResponse.json({ error: 'workflow_id valide requis pour workflow_run' }, { status: 400 })
    }

    const validScheduleTypes: ScheduleType[] = ['once', 'daily', 'weekly', 'monthly', 'cron']
    if (!validScheduleTypes.includes(schedule_type)) {
      return NextResponse.json({ error: 'schedule_type invalide' }, { status: 400 })
    }

    const config: ScheduleConfig = schedule_config || {}
    const nextRunAt = calculateNextRun(schedule_type as ScheduleType, config)

    // Extract cron_expression for indexed queries
    const cronExpression = schedule_type === 'cron' ? config.expression || null : null

    const { data, error } = await supabase
      .from('scheduled_tasks')
      .insert({
        client_id: profile.client_id,
        name: sanitizeString(name),
        description: description ? sanitizeString(description) : null,
        task_type,
        agent_id: task_type === 'agent_run' ? agent_id : null,
        workflow_id: task_type === 'workflow_run' ? workflow_id : null,
        prompt: prompt ? sanitizeString(prompt) : null,
        schedule_type,
        schedule_config: config,
        cron_expression: cronExpression,
        timezone: timezone || 'Europe/Paris',
        next_run_at: nextRunAt?.toISOString() ?? null,
        active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ task: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
