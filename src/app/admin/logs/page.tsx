import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AGENTS } from '@/lib/agents-config'
import { Download } from 'lucide-react'

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs d&apos;activite</h1>
          <p className="text-gray-500">Historique des operations de tous les agents</p>
        </div>
        <a
          href="/api/admin/logs/export"
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          <Download className="w-4 h-4" /> Export CSV global
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <div>
            <p className="text-lg font-bold text-gray-900">{totalLogs}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div>
            <p className="text-lg font-bold text-green-600">{successCount}</p>
            <p className="text-xs text-gray-500">Succes</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div>
            <p className="text-lg font-bold text-red-600">{errorCount}</p>
            <p className="text-xs text-gray-500">Erreurs</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div>
            <p className="text-lg font-bold text-yellow-600">{warningCount}</p>
            <p className="text-xs text-gray-500">Warnings</p>
          </div>
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Duree</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs && logs.length > 0 ? (
                logs.map(log => {
                  const agentInfo = agentMap.get(log.agent_id)
                  const agentConfig = agentInfo ? AGENTS.find(a => a.type === agentInfo.type) : null
                  const clientName = log.client_id ? clientMap.get(log.client_id) : '—'
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition text-sm">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' :
                          log.status === 'error' ? 'bg-red-100 text-red-700' :
                          log.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {agentConfig ? (
                          <span className="flex items-center gap-1.5">
                            <span>{agentConfig.icon}</span>
                            <span className="text-gray-700 font-medium">{agentConfig.name}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{clientName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.action}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {log.tokens_used > 0 ? log.tokens_used.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {log.duration_ms > 0 ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Aucun log enregistre
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
