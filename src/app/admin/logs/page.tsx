import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AGENTS } from '@/lib/agents-config'
import { Download, FileText } from 'lucide-react'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import type { AgentType } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'

export default async function LogsPage() {
  const supabase = createServerSupabaseClient()

  const [
    { data: logs },
    { data: agents },
    { data: clients },
  ] = await Promise.all([
    supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('agents').select('id, type, client_id'),
    supabase.from('clients').select('id, company_name'),
  ])

  const agentMap = new Map<string, { type: string; clientId: string }>()
  agents?.forEach(a => agentMap.set(a.id, { type: a.type, clientId: a.client_id }))

  const clientMap = new Map<string, string>()
  clients?.forEach(c => clientMap.set(c.id, c.company_name))

  // Stats
  const totalLogs = logs?.length || 0
  const successCount = logs?.filter(l => l.status === 'success').length || 0
  const errorCount = logs?.filter(l => l.status === 'error').length || 0
  const warningCount = logs?.filter(l => l.status === 'warning').length || 0

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<FileText className="w-5 h-5 text-brand-500" />}
        title="Logs d'activité"
        subtitle="Historique des opérations de tous les agents"
      />
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/logs/export?format=pdf"
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> PDF
          </a>
          <a
            href="/api/admin/logs/export"
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> CSV
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-ink-300" />
          <div>
            <p className="text-lg font-bold text-ink-700">{totalLogs}</p>
            <p className="text-xs text-ink-400">Total</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div>
            <p className="text-lg font-bold text-emerald-600">{successCount}</p>
            <p className="text-xs text-ink-400">Succès</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div>
            <p className="text-lg font-bold text-red-600">{errorCount}</p>
            <p className="text-xs text-ink-400">Erreurs</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <div>
            <p className="text-lg font-bold text-amber-600">{warningCount}</p>
            <p className="text-xs text-ink-400">Warnings</p>
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-ink-400 uppercase tracking-wider border-b border-surface-100">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Durée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {logs && logs.length > 0 ? (
                logs.map(log => {
                  const agentInfo = agentMap.get(log.agent_id)
                  const agentConfig = agentInfo ? AGENTS.find(a => a.type === agentInfo.type) : null
                  const clientName = log.client_id ? clientMap.get(log.client_id) : '—'
                  return (
                    <tr key={log.id} className="hover:bg-surface-50 transition-colors text-sm">
                      <td className="px-4 py-3 text-ink-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'success' ? 'badge-success' :
                          log.status === 'error' ? 'badge-error' :
                          log.status === 'warning' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {agentConfig ? (
                          <span className="flex items-center gap-1.5">
                            <AgentAvatar type={agentConfig.type as AgentType} size="sm" />
                            <span className="text-ink-600 font-medium">{agentConfig.name}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{clientName || '—'}</td>
                      <td className="px-4 py-3 text-ink-500 max-w-xs truncate">{log.action}</td>
                      <td className="px-4 py-3 text-ink-400 font-mono text-xs">
                        {log.tokens_used > 0 ? log.tokens_used.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-400 text-xs">
                        {log.duration_ms > 0 ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-300">
                    Aucun log enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
