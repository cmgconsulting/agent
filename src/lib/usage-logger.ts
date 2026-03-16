import { createServiceRoleClient } from '@/lib/supabase/server'
import { TASK_HUMAN_TIME_MAP } from '@/types/database'
import type { UsageLogStatus } from '@/types/database'

// Default estimated human time in minutes when task type is unknown
const DEFAULT_HUMAN_MINUTES = 15

export interface LogAgentUsageParams {
  clientId: string
  agentId: string
  userId: string
  taskType: string
  agentDurationSeconds: number
  tokensUsed: number
  status: UsageLogStatus
  errorMessage?: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget logger for agent usage.
 * Inserts a row into agent_usage_logs using the service role client (bypasses RLS).
 * Looks up estimated_human_minutes from TASK_HUMAN_TIME_MAP; defaults to 15 if unknown.
 * Never throws — all errors are caught and logged to the console only.
 */
export async function logAgentUsage(params: LogAgentUsageParams): Promise<void> {
  try {
    const {
      clientId,
      agentId,
      userId,
      taskType,
      agentDurationSeconds,
      tokensUsed,
      status,
      errorMessage,
      metadata,
    } = params

    const estimatedHumanMinutes = TASK_HUMAN_TIME_MAP[taskType] ?? DEFAULT_HUMAN_MINUTES

    const serviceClient = createServiceRoleClient()

    const { error } = await serviceClient.from('agent_usage_logs').insert({
      client_id: clientId,
      agent_id: agentId,
      user_id: userId,
      task_type: taskType,
      estimated_human_minutes: estimatedHumanMinutes,
      agent_duration_seconds: agentDurationSeconds,
      tokens_used: tokensUsed,
      status,
      error_message: errorMessage ?? null,
      metadata: metadata ?? {},
    })

    if (error) {
      console.error('[usage-logger] Failed to insert agent_usage_logs row:', error)
    }
  } catch (err) {
    // Never throw — this is a fire-and-forget utility
    console.error('[usage-logger] Unexpected error:', err)
  }
}
