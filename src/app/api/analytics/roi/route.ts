import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'
import { AGENTS } from '@/lib/agents-config'
import type { AgentType } from '@/types/database'

export const dynamic = 'force-dynamic'
// Default hourly cost if no roi_config exists
const DEFAULT_HOURLY_COST_EUROS = 45

type Period = 'week' | 'month' | 'quarter'

function getPeriodRange(period: Period, offsetPeriods = 0): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date()
  const end = new Date()

  if (period === 'week') {
    // ISO week: Monday to Sunday
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon, 6=Sun
    const currentMonday = new Date(now)
    currentMonday.setDate(now.getDate() - dayOfWeek)
    currentMonday.setHours(0, 0, 0, 0)

    start.setTime(currentMonday.getTime() - offsetPeriods * 7 * 24 * 60 * 60 * 1000)
    end.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  } else if (period === 'month') {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - offsetPeriods, 1)
    start.setTime(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 0, 0, 0, 0).getTime())
    end.setTime(new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1, 0, 0, 0, 0).getTime())
  } else {
    // quarter
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const targetQuarter = currentQuarter - offsetPeriods
    const targetYear = now.getFullYear() + Math.floor(targetQuarter / 4)
    const normalizedQuarter = ((targetQuarter % 4) + 4) % 4
    start.setTime(new Date(targetYear, normalizedQuarter * 3, 1, 0, 0, 0, 0).getTime())
    end.setTime(new Date(targetYear, normalizedQuarter * 3 + 3, 1, 0, 0, 0, 0).getTime())
  }

  return { start, end }
}

interface AgentInfo {
  type: AgentType
  name: string
}

interface UsageLogRow {
  agent_id: string
  estimated_human_minutes: number
  status: string
  // Supabase returns FK-joined rows as an array (even for to-one relations)
  agents: AgentInfo[] | AgentInfo | null
}

interface AgentSummary {
  agent_id: string
  agent_name: string
  agent_type: AgentType
  count: number
  hours_saved: number
}

function resolveAgentInfo(agents: UsageLogRow['agents']): AgentInfo | null {
  if (!agents) return null
  if (Array.isArray(agents)) return agents[0] ?? null
  return agents
}

function computeMetrics(logs: UsageLogRow[], hourlyRate: number) {
  let totalHumanMinutes = 0
  let totalTasks = 0
  const agentMap = new Map<string, AgentSummary>()

  for (const log of logs) {
    if (log.status !== 'success') continue
    totalHumanMinutes += log.estimated_human_minutes
    totalTasks++

    const agentId = log.agent_id
    if (!agentMap.has(agentId)) {
      const agentInfo = resolveAgentInfo(log.agents)
      const agentType = (agentInfo?.type ?? 'marc') as AgentType
      const agentConfig = AGENTS.find(a => a.type === agentType)
      agentMap.set(agentId, {
        agent_id: agentId,
        agent_name: agentInfo?.name ?? agentConfig?.name ?? agentId,
        agent_type: agentType,
        count: 0,
        hours_saved: 0,
      })
    }

    const entry = agentMap.get(agentId)!
    entry.count++
    entry.hours_saved += log.estimated_human_minutes / 60
  }

  const totalHoursSaved = totalHumanMinutes / 60
  const equivalentEuros = Math.round(totalHoursSaved * hourlyRate * 100) / 100
  const tasksByAgent = Array.from(agentMap.values()).map(e => ({
    ...e,
    hours_saved: Math.round(e.hours_saved * 100) / 100,
  }))
  const top3Agents = [...tasksByAgent].sort((a, b) => b.count - a.count).slice(0, 3)

  return {
    total_hours_saved: Math.round(totalHoursSaved * 100) / 100,
    equivalent_euros: equivalentEuros,
    total_tasks: totalTasks,
    tasks_by_agent: tasksByAgent,
    top_3_agents: top3Agents,
  }
}

// Compute percentage change between two values; returns null when no meaningful comparison exists
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 10000) / 100
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    // Rate limiting
    const rl = checkRateLimit(`roi:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    // Fetch client record for authenticated user
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const clientId = client.id

    // Parse period query param
    const url = new URL(request.url)
    const rawPeriod = url.searchParams.get('period') ?? 'month'
    const period: Period = ['week', 'month', 'quarter'].includes(rawPeriod)
      ? (rawPeriod as Period)
      : 'month'

    // Compute current and previous period boundaries
    const current = getPeriodRange(period, 0)
    const previous = getPeriodRange(period, 1)

    // Fetch roi_config for hourly cost (fall back to default)
    const { data: roiConfig } = await supabase
      .from('roi_config')
      .select('hourly_cost_euros')
      .eq('client_id', clientId)
      .single()

    const hourlyRate = roiConfig?.hourly_cost_euros ?? DEFAULT_HOURLY_COST_EUROS

    // Fetch usage logs for current period (with agent join)
    const { data: currentLogs, error: currentError } = await supabase
      .from('agent_usage_logs')
      .select('agent_id, estimated_human_minutes, status, agents(type, name)')
      .eq('client_id', clientId)
      .gte('created_at', current.start.toISOString())
      .lt('created_at', current.end.toISOString())

    if (currentError) {
      console.error('[analytics/roi] Error fetching current logs:', currentError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des donnees' }, { status: 500 })
    }

    // Fetch usage logs for previous period
    const { data: previousLogs, error: previousError } = await supabase
      .from('agent_usage_logs')
      .select('agent_id, estimated_human_minutes, status, agents(type, name)')
      .eq('client_id', clientId)
      .gte('created_at', previous.start.toISOString())
      .lt('created_at', previous.end.toISOString())

    if (previousError) {
      console.error('[analytics/roi] Error fetching previous logs:', previousError)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des donnees' }, { status: 500 })
    }

    const currentMetrics = computeMetrics((currentLogs ?? []) as unknown as UsageLogRow[], hourlyRate)
    const previousMetrics = computeMetrics((previousLogs ?? []) as unknown as UsageLogRow[], hourlyRate)

    const comparison = {
      total_hours_saved_change: pctChange(currentMetrics.total_hours_saved, previousMetrics.total_hours_saved),
      equivalent_euros_change: pctChange(currentMetrics.equivalent_euros, previousMetrics.equivalent_euros),
      total_tasks_change: pctChange(currentMetrics.total_tasks, previousMetrics.total_tasks),
      previous_period: {
        total_hours_saved: previousMetrics.total_hours_saved,
        equivalent_euros: previousMetrics.equivalent_euros,
        total_tasks: previousMetrics.total_tasks,
      },
    }

    return NextResponse.json({
      period,
      period_start: current.start.toISOString(),
      period_end: current.end.toISOString(),
      hourly_cost_euros: hourlyRate,
      ...currentMetrics,
      comparison,
    })
  } catch (err) {
    console.error('[analytics/roi] Unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
