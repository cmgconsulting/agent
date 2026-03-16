import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { calculateNextRun } from '@/lib/schedule-calculator'
import { runAgent } from '@/lib/agent-framework'
import type { ScheduleType, ScheduleConfig, AgentType } from '@/types/database'

// Vercel cron secret for authorization
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/execute-tasks
 * Called by Vercel Cron every minute.
 * Finds tasks due for execution, locks them, and runs them.
 */
export async function GET(request: Request) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()
  const lockKey = crypto.randomUUID()
  const lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min lock

  // Atomically lock tasks that are due
  // Uses locked_until to prevent double-execution
  const { data: tasksToRun, error: lockError } = await supabase
    .from('scheduled_tasks')
    .update({
      locked_until: lockUntil,
      lock_key: lockKey,
    })
    .eq('active', true)
    .lte('next_run_at', now)
    .or('locked_until.is.null,locked_until.lt.' + now)
    .select('*, agents!scheduled_tasks_agent_id_fkey(type)')

  if (lockError) {
    console.error('[cron] Failed to lock tasks:', lockError)
    return NextResponse.json({ error: lockError.message }, { status: 500 })
  }

  if (!tasksToRun?.length) {
    return NextResponse.json({ executed: 0 })
  }

  const results: { taskId: string; status: string; error?: string }[] = []

  for (const task of tasksToRun) {
    // Verify we still hold the lock
    if (task.lock_key !== lockKey) continue

    const runStartTime = Date.now()
    let runStatus: 'completed' | 'failed' = 'completed'
    let output = ''
    let errorMessage = ''
    let tokensUsed = 0

    try {
      if (task.task_type === 'agent_run' && task.agent_id) {
        // Get agent type from the joined relation
        const agentData = task.agents as unknown as { type: string } | null
        const agentType = agentData?.type as AgentType | undefined

        if (!agentType) {
          throw new Error(`Agent type not found for agent_id ${task.agent_id}`)
        }

        const result = await runAgent({
          clientId: task.client_id,
          agentType,
          trigger: 'scheduled',
          userMessage: task.prompt || undefined,
          taskType: 'scheduled_task',
          metadata: { scheduled_task_id: task.id },
        })

        output = result.response.slice(0, 2000)
        tokensUsed = result.tokensUsed
      } else if (task.task_type === 'workflow_run') {
        // Workflow execution would go here when implemented
        output = 'Workflow execution not yet implemented'
      }
    } catch (err) {
      runStatus = 'failed'
      errorMessage = err instanceof Error ? err.message : String(err)
    }

    const durationMs = Date.now() - runStartTime

    // Insert run record
    await supabase.from('scheduled_task_runs').insert({
      task_id: task.id,
      client_id: task.client_id,
      status: runStatus,
      output,
      error_message: errorMessage || null,
      tokens_used: tokensUsed,
      duration_ms: durationMs,
      triggered_by: 'cron',
      started_at: new Date(runStartTime).toISOString(),
      completed_at: new Date().toISOString(),
    })

    // Calculate next run and update task
    const scheduleConfig = task.schedule_config as ScheduleConfig
    const nextRunAt = calculateNextRun(task.schedule_type as ScheduleType, scheduleConfig)

    // For 'once' tasks, deactivate after execution
    const shouldDeactivate = task.schedule_type === 'once'

    await supabase
      .from('scheduled_tasks')
      .update({
        last_run_at: now,
        next_run_at: nextRunAt?.toISOString() ?? null,
        locked_until: null,
        lock_key: null,
        run_count: (task.run_count || 0) + 1,
        error_count: runStatus === 'failed' ? (task.error_count || 0) + 1 : task.error_count,
        last_error: runStatus === 'failed' ? errorMessage : null,
        active: shouldDeactivate ? false : task.active,
      })
      .eq('id', task.id)
      .eq('lock_key', lockKey) // Only update if we still hold the lock

    results.push({
      taskId: task.id,
      status: runStatus,
      error: errorMessage || undefined,
    })
  }

  return NextResponse.json({ executed: results.length, results })
}
