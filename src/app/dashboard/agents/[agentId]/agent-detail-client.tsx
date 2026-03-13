'use client'

import { useState, useEffect, useRef } from 'react'
import type { Agent, AgentLog, PendingAction } from '@/types/database'
import { Send, CheckCircle, XCircle, Clock, Activity, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react'

interface AgentDetailClientProps {
  agent: Agent
  initialLogs: AgentLog[]
  initialPendingActions: PendingAction[]
}

export function AgentDetailClient({ agent, initialLogs, initialPendingActions }: AgentDetailClientProps) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(initialPendingActions)
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [sending, setSending] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'logs' | 'actions'>('chat')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Real-time logs polling (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const lastLog = logs[0]
        const since = lastLog?.created_at || new Date(0).toISOString()
        const res = await fetch(`/api/admin/agents/${agent.id}/logs?since=${since}&limit=20`)
        if (res.ok) {
          const { logs: newLogs } = await res.json()
          if (newLogs && newLogs.length > 0) {
            setLogs(prev => {
              const ids = new Set(prev.map(l => l.id))
              const unique = newLogs.filter((l: AgentLog) => !ids.has(l.id))
              return [...unique, ...prev]
            })
          }
        }
      } catch {
        // silent
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [agent.id, logs])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return

    const userMsg = message.trim()
    setMessage('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setSending(true)

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: agent.type,
          message: userMsg,
          trigger: 'manual',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        if (data.actions?.length > 0) {
          // Refresh pending actions
          refreshPendingActions()
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${data.error}` }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion' }])
    } finally {
      setSending(false)
    }
  }

  async function refreshPendingActions() {
    try {
      // Re-fetch pending actions for this agent
      const res = await fetch(`/api/admin/agents/${agent.id}/logs?limit=1`)
      if (res.ok) {
        // Simple approach: we'll rely on the polling to update logs
      }
    } catch {
      // silent
    }
  }

  async function handleAction(actionId: string, decision: 'approve' | 'reject') {
    setApprovingId(actionId)
    try {
      const res = await fetch(`/api/actions/${actionId}/${decision}`, { method: 'POST' })
      if (res.ok) {
        setPendingActions(prev => prev.filter(a => a.id !== actionId))
      }
    } catch {
      // silent
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          {[
            { key: 'chat', label: 'Chat', icon: MessageSquare },
            { key: 'logs', label: 'Logs', icon: Activity },
            { key: 'actions', label: `Actions (${pendingActions.length})`, icon: Clock },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '500px' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-400 py-16">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p>Commencez une conversation avec {agent.name}</p>
                  <p className="text-sm mt-1">Posez une question ou demandez une action</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {agent.name} reflechit...
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Parler a ${agent.name}...`}
                disabled={sending || !agent.active}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || !message.trim() || !agent.active}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Logs tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucun log</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      log.status === 'success' ? 'bg-green-500' :
                      log.status === 'error' ? 'bg-red-500' :
                      log.status === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{log.action}</p>
                      {log.payload_summary && (
                        <p className="text-xs text-gray-500 mt-0.5">{log.payload_summary}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                      </p>
                      {log.tokens_used > 0 && (
                        <p className="text-xs text-gray-300">{log.tokens_used} tokens</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions tab */}
        {activeTab === 'actions' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {pendingActions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Aucune action en attente</p>
            ) : (
              <div className="space-y-4">
                {pendingActions.map(action => (
                  <div key={action.id} className="border border-orange-200 bg-orange-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <h4 className="font-semibold text-gray-900">{action.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Type: {action.action_type} · {new Date(action.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {action.payload && Object.keys(action.payload).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Voir les details
                        </summary>
                        <pre className="mt-2 p-3 bg-white rounded-lg text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(action.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAction(action.id, 'approve')}
                        disabled={approvingId === action.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approuver
                      </button>
                      <button
                        onClick={() => handleAction(action.id, 'reject')}
                        disabled={approvingId === action.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white text-red-600 text-sm border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar: Quick stats + connected tools */}
      <div className="space-y-6">
        {/* Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Statistiques (7j)</h3>
          <div className="space-y-3">
            {[
              { label: 'Total actions', value: logs.filter(l => l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length, color: 'blue' },
              { label: 'Succes', value: logs.filter(l => l.status === 'success' && l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length, color: 'green' },
              { label: 'Erreurs', value: logs.filter(l => l.status === 'error' && l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length, color: 'red' },
              { label: 'En attente', value: pendingActions.length, color: 'orange' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <span className={`font-semibold text-${stat.color}-600`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens used */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Consommation</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Tokens (7j)</span>
              <span className="font-semibold text-gray-900">
                {logs
                  .filter(l => l.created_at > new Date(Date.now() - 7 * 86400000).toISOString())
                  .reduce((sum, l) => sum + (l.tokens_used || 0), 0)
                  .toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Temps moyen</span>
              <span className="font-semibold text-gray-900">
                {(() => {
                  const recent = logs.filter(l => l.duration_ms > 0 && l.created_at > new Date(Date.now() - 7 * 86400000).toISOString())
                  if (recent.length === 0) return '--'
                  const avg = recent.reduce((sum, l) => sum + l.duration_ms, 0) / recent.length
                  return `${(avg / 1000).toFixed(1)}s`
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
