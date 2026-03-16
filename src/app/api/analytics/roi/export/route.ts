import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'
import type { AgentType } from '@/types/database'
import { AGENTS } from '@/lib/agents-config'
import { renderRoiReportPdf } from '@/lib/pdf/report-templates'

interface AgentExportInfo {
  type: AgentType
  name: string
}

interface UsageLogExportRow {
  created_at: string
  estimated_human_minutes: number
  agent_duration_seconds: number
  tokens_used: number
  status: string
  task_type: string
  agent_id: string
  // Supabase returns FK-joined rows as an array (even for to-one relations)
  agents: AgentExportInfo[] | AgentExportInfo | null
}

/**
 * Escapes a CSV cell value: wraps in double quotes, escapes inner quotes.
 */
function csvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  // If it contains comma, newline, or double quote → wrap in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Non authentifie' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Rate limiting (stricter export limit)
    const rl = checkRateLimit(`roi-export:${user.id}`, RATE_LIMITS.export)
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop d\'exports. Reessayez plus tard.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rl.resetIn / 1000)),
          },
        }
      )
    }

    // Fetch client record
    const { data: client } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return new Response(JSON.stringify({ error: 'Client introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const clientId = client.id

    // Parse format query param (only 'csv' supported for now)
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'csv'

    if (format !== 'csv' && format !== 'pdf') {
      return new Response(
        JSON.stringify({ error: 'Format non supporte. Utilisez format=csv ou format=pdf' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch usage logs with agent join, ordered newest first, max 10 000 rows
    const { data: logs, error: logsError } = await supabase
      .from('agent_usage_logs')
      .select('created_at, estimated_human_minutes, agent_duration_seconds, tokens_used, status, task_type, agent_id, agents(type, name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10000)

    if (logsError) {
      console.error('[analytics/roi/export] Error fetching logs:', logsError)
      return new Response(JSON.stringify({ error: 'Erreur lors de la recuperation des donnees' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build a lookup map from AGENTS config for agent type → name fallback
    const agentConfigMap = new Map(AGENTS.map(a => [a.type, a.name]))

    // PDF export
    if (format === 'pdf') {
      const roiRows = ((logs ?? []) as unknown as UsageLogExportRow[]).map(log => {
        const agentInfo: AgentExportInfo | null = Array.isArray(log.agents)
          ? (log.agents[0] ?? null)
          : (log.agents ?? null)
        const agentType = agentInfo?.type
        const agentName = agentInfo?.name
          ?? (agentType ? agentConfigMap.get(agentType) : undefined)
          ?? log.agent_id

        return {
          created_at: log.created_at,
          agent_name: String(agentName),
          task_type: log.task_type || '',
          estimated_human_minutes: log.estimated_human_minutes || 0,
          agent_duration_seconds: log.agent_duration_seconds || 0,
          tokens_used: log.tokens_used || 0,
          status: log.status,
        }
      })

      const totalHumanMinutes = roiRows.reduce((s, r) => s + r.estimated_human_minutes, 0)
      const totalAgentSeconds = roiRows.reduce((s, r) => s + r.agent_duration_seconds, 0)
      const totalTokens = roiRows.reduce((s, r) => s + r.tokens_used, 0)

      const pdfBuffer = await renderRoiReportPdf(client.company_name, roiRows, {
        totalHumanMinutes,
        totalAgentSeconds,
        totalTokens,
      })

      const pdfDate = new Date().toISOString().split('T')[0]
      const safeName = client.company_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="roi-${safeName}-${pdfDate}.pdf"`,
        },
      })
    }

    // CSV header row (French labels as specified)
    const headerRow = [
      'Date',
      'Agent',
      'Type de tache',
      'Temps humain estime (min)',
      'Temps agent (sec)',
      'Tokens',
      'Statut',
    ].join(',')

    const dataRows = ((logs ?? []) as unknown as UsageLogExportRow[]).map(log => {
      // Supabase may return joined rows as an array or single object
      const agentInfo: AgentExportInfo | null = Array.isArray(log.agents)
        ? (log.agents[0] ?? null)
        : (log.agents ?? null)
      const agentType = agentInfo?.type
      const agentName = agentInfo?.name
        ?? (agentType ? agentConfigMap.get(agentType) : undefined)
        ?? log.agent_id

      return [
        csvCell(log.created_at),
        csvCell(agentName),
        csvCell(log.task_type),
        csvCell(log.estimated_human_minutes),
        csvCell(log.agent_duration_seconds),
        csvCell(log.tokens_used),
        csvCell(log.status),
      ].join(',')
    })

    const csv = [headerRow, ...dataRows].join('\n')

    // Generate filename: logs-roi-{company}-{date}.csv
    const date = new Date().toISOString().split('T')[0]
    const safeName = client.company_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="logs-roi-${safeName}-${date}.csv"`,
      },
    })
  } catch (err) {
    console.error('[analytics/roi/export] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
