// ============================================
// WORKFLOW ENGINE
// Executes workflows step by step, calling the Anthropic API
// for each step and persisting results in the DB.
// Uses service role client (bypasses RLS) — only called server-side.
// ============================================

import Anthropic from '@anthropic-ai/sdk'
import { createServiceRoleClient } from '@/lib/supabase/server'

const MODEL = 'claude-sonnet-4-6-20250514'
const MAX_TOKENS = 4096

// ============================================
// TYPES
// ============================================

interface WorkflowStepRow {
  id: string
  workflow_id: string
  step_order: number
  agent_id: string
  prompt_template: string
  condition: Record<string, unknown> | null
  timeout_seconds: number
  on_error: 'stop' | 'skip' | 'retry'
}

interface AgentRow {
  id: string
  name: string
  system_prompt: string | null
  type: string
}

// ============================================
// HELPERS
// ============================================

/**
 * Replace template variables in a prompt string.
 * Supports: {{previous_output}}, {{trigger_data}}, {{step_N_output}}
 */
function buildPrompt(
  template: string,
  triggerData: Record<string, unknown>,
  stepOutputs: Record<number, string>
): string {
  let prompt = template

  // Replace {{trigger_data}} with JSON representation
  prompt = prompt.replace(/\{\{trigger_data\}\}/g, JSON.stringify(triggerData, null, 2))

  // Replace {{previous_output}} with the last available step output
  const stepNums = Object.keys(stepOutputs).map(Number).sort((a, b) => a - b)
  const lastOutput = stepNums.length > 0 ? stepOutputs[stepNums[stepNums.length - 1]] : ''
  prompt = prompt.replace(/\{\{previous_output\}\}/g, lastOutput)

  // Replace {{step_N_output}} for each step number
  for (const [stepNum, output] of Object.entries(stepOutputs)) {
    const regex = new RegExp(`\\{\\{step_${stepNum}_output\\}\\}`, 'g')
    prompt = prompt.replace(regex, output)
  }

  return prompt
}

/**
 * Evaluate a condition against the previous step output.
 * Condition schema: { contains?: string, matches?: string, not_empty?: boolean }
 * Returns true if the step should execute (condition met or no condition).
 */
function evaluateCondition(
  condition: Record<string, unknown> | null,
  previousOutput: string
): boolean {
  if (!condition || Object.keys(condition).length === 0) return true

  if (condition.not_empty === true && !previousOutput.trim()) return false

  if (typeof condition.contains === 'string') {
    if (!previousOutput.toLowerCase().includes(condition.contains.toLowerCase())) return false
  }

  if (typeof condition.matches === 'string') {
    try {
      const regex = new RegExp(condition.matches, 'i')
      if (!regex.test(previousOutput)) return false
    } catch {
      // Invalid regex — treat as not matching
      return false
    }
  }

  return true
}

/**
 * Call the Anthropic API for a single step.
 * Returns the text output and usage stats.
 */
async function callAnthropic(
  systemPrompt: string | null,
  userPrompt: string
): Promise<{ output: string; tokensUsed: number }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt },
  ]

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages,
  }

  if (systemPrompt) {
    params.system = systemPrompt
  }

  const response = await anthropic.messages.create(params)

  const output = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

  return { output, tokensUsed }
}

// ============================================
// MAIN ENGINE FUNCTION
// ============================================

export async function executeWorkflow(
  executionId: string,
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<void> {
  const adminClient = createServiceRoleClient()

  // Helper: mark execution as failed
  async function failExecution(errorMsg: string) {
    await adminClient
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: errorMsg,
      })
      .eq('id', executionId)
  }

  try {
    // Load steps ordered by step_order
    const { data: steps, error: stepsError } = await adminClient
      .from('workflow_steps')
      .select('id, workflow_id, step_order, agent_id, prompt_template, condition, timeout_seconds, on_error')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      await failExecution('Aucune etape trouvee pour ce workflow')
      return
    }

    // Track outputs per step_order for template variable replacement
    const stepOutputs: Record<number, string> = {}

    for (const step of steps as WorkflowStepRow[]) {
      const stepStartedAt = new Date()

      // Load agent system_prompt
      const { data: agent } = await adminClient
        .from('agents')
        .select('id, name, type, system_prompt')
        .eq('id', step.agent_id)
        .single()

      const agentRow = agent as AgentRow | null

      // Evaluate condition against previous step output
      const previousOutput = Object.keys(stepOutputs).length > 0
        ? stepOutputs[Math.max(...Object.keys(stepOutputs).map(Number))]
        : ''

      const conditionMet = evaluateCondition(step.condition, previousOutput)

      if (!conditionMet) {
        // Save skipped result
        await adminClient.from('workflow_step_results').insert({
          execution_id: executionId,
          step_id: step.id,
          agent_id: step.agent_id,
          input: { prompt: '', trigger_data: triggerData },
          output: null,
          status: 'skipped',
          duration_ms: 0,
          tokens_used: 0,
          started_at: stepStartedAt.toISOString(),
          completed_at: new Date().toISOString(),
        })
        continue
      }

      // Build the prompt from template
      const builtPrompt = buildPrompt(step.prompt_template, triggerData, stepOutputs)

      // Mark step as running
      await adminClient.from('workflow_step_results').insert({
        execution_id: executionId,
        step_id: step.id,
        agent_id: step.agent_id,
        input: { prompt: builtPrompt, trigger_data: triggerData },
        output: null,
        status: 'running',
        duration_ms: null,
        tokens_used: null,
        started_at: stepStartedAt.toISOString(),
        completed_at: null,
      })

      // Attempt execution (with optional retry)
      let lastError: Error | null = null
      let output: string | null = null
      let tokensUsed = 0
      let succeeded = false
      const maxAttempts = step.on_error === 'retry' ? 2 : 1

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await callAnthropic(agentRow?.system_prompt ?? null, builtPrompt)
          output = result.output
          tokensUsed = result.tokensUsed
          succeeded = true
          lastError = null
          break
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          console.error(
            `[workflow engine] Step ${step.step_order} attempt ${attempt + 1} failed:`,
            lastError.message
          )
        }
      }

      const stepCompletedAt = new Date()
      const durationMs = stepCompletedAt.getTime() - stepStartedAt.getTime()

      if (succeeded && output !== null) {
        // Save step output
        stepOutputs[step.step_order] = output

        await adminClient
          .from('workflow_step_results')
          .update({
            output,
            status: 'success',
            duration_ms: durationMs,
            tokens_used: tokensUsed,
            completed_at: stepCompletedAt.toISOString(),
          })
          .eq('execution_id', executionId)
          .eq('step_id', step.id)
      } else {
        // Step failed
        const errMessage = lastError?.message ?? 'Erreur inconnue'

        await adminClient
          .from('workflow_step_results')
          .update({
            output: null,
            status: 'error',
            duration_ms: durationMs,
            tokens_used: 0,
            completed_at: stepCompletedAt.toISOString(),
          })
          .eq('execution_id', executionId)
          .eq('step_id', step.id)

        if (step.on_error === 'stop') {
          await failExecution(`Echec a l'etape ${step.step_order}: ${errMessage}`)
          return
        }
        // on_error === 'skip' or 'retry' (retry already exhausted): continue
      }
    }

    // All steps done — mark execution as completed
    await adminClient
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', executionId)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[workflow engine] Unexpected error:', errMsg)
    await failExecution(`Erreur inattendue: ${errMsg}`)
  }
}
