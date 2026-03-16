import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AgentSessionStatus, AgentSessionTrigger, ActivityEventType } from '@/types/database'

/**
 * Creates a new agent session and returns its ID.
 * Used at the start of runAgent() to track execution in real-time.
 */
export async function createAgentSession(params: {
  clientId: string
  agentId: string
  userId?: string
  trigger?: AgentSessionTrigger
  inputPreview?: string
}): Promise<string> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('agent_sessions')
    .insert({
      client_id: params.clientId,
      agent_id: params.agentId,
      user_id: params.userId ?? null,
      trigger: params.trigger ?? 'manual',
      status: 'thinking' as AgentSessionStatus,
      input_preview: params.inputPreview?.slice(0, 500) ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[agent-session] Failed to create session:', error)
    throw new Error('Failed to create agent session')
  }

  return data.id
}

/**
 * Updates session status and emits an activity event.
 */
export async function updateSessionStatus(
  sessionId: string,
  clientId: string,
  status: AgentSessionStatus,
  extra?: { errorMessage?: string; outputPreview?: string; tokensUsed?: number; toolsCalled?: number; durationMs?: number }
): Promise<void> {
  const supabase = createServiceRoleClient()

  const updatePayload: Record<string, unknown> = { status }
  if (extra?.errorMessage) updatePayload.error_message = extra.errorMessage
  if (extra?.outputPreview) updatePayload.output_preview = extra.outputPreview.slice(0, 500)
  if (extra?.tokensUsed !== undefined) updatePayload.tokens_used = extra.tokensUsed
  if (extra?.toolsCalled !== undefined) updatePayload.tools_called = extra.toolsCalled
  if (extra?.durationMs !== undefined) updatePayload.duration_ms = extra.durationMs
  if (status === 'completed' || status === 'error') updatePayload.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('agent_sessions')
    .update(updatePayload)
    .eq('id', sessionId)

  if (error) console.error('[agent-session] Failed to update session:', error)

  // Emit status_change event
  await emitActivityEvent(sessionId, clientId, 'status_change', { status, ...extra })
}

/**
 * Emits a granular activity event (tool call, result, message, etc.).
 */
export async function emitActivityEvent(
  sessionId: string,
  clientId: string,
  eventType: ActivityEventType,
  eventData: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('agent_activity_stream')
    .insert({
      session_id: sessionId,
      client_id: clientId,
      event_type: eventType,
      event_data: eventData,
    })

  if (error) console.error('[agent-session] Failed to emit activity event:', error)
}
