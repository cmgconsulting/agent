'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Agent, AgentLog, PendingAction } from '@/types/database'
import { Send, CheckCircle, XCircle, Clock, Activity, MessageSquare, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react'
import { FeedbackAssistant, detectDissatisfaction } from '@/components/feedback-assistant'
import { AgentAvatar } from '@/components/agents/agent-avatars'
import { getAgentConfig } from '@/lib/agents-config'
import { useToast } from '@/components/ui/toast-provider'

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
  const { showToast } = useToast()

  // Feedback / auto-amélioration
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackContext, setFeedbackContext] = useState<{
    userMessage: string
    agentResponse: string
    dissatisfactionMessage: string
  } | null>(null)

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

  // Trouver le dernier échange (message user + réponse assistant) avant le message actuel
  const getLastExchange = useCallback(() => {
    const msgs = chatMessages
    if (msgs.length < 2) return null
    // Chercher le dernier message assistant et le message user juste avant
    for (let i = msgs.length - 1; i >= 1; i--) {
      if (msgs[i].role === 'assistant' && msgs[i - 1].role === 'user') {
        return { userMessage: msgs[i - 1].content, agentResponse: msgs[i].content }
      }
    }
    return null
  }, [chatMessages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return

    const userMsg = message.trim()
    setMessage('')

    // Détecter l'insatisfaction AVANT d'envoyer
    if (detectDissatisfaction(userMsg)) {
      const lastExchange = getLastExchange()
      if (lastExchange) {
        // Afficher le FeedbackAssistant au lieu d'envoyer directement
        setFeedbackContext({
          userMessage: lastExchange.userMessage,
          agentResponse: lastExchange.agentResponse,
          dissatisfactionMessage: userMsg,
        })
        setShowFeedback(true)
        // Ajouter quand même le message de l'utilisateur au chat
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
        return
      }
    }

    // Masquer le feedback si visible
    setShowFeedback(false)
    setFeedbackContext(null)

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
        showToast({
          title: `${agent.name} a termine sa reponse`,
          type: 'agent',
          agentType: agent.type,
          duration: 3000,
        })
        if (data.actions?.length > 0) {
          refreshPendingActions()
          for (const action of data.actions) {
            showToast({
              title: `${agent.name} demande votre approbation`,
              message: action.title || action.description || undefined,
              type: 'warning',
              duration: 8000,
            })
          }
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

  // Callback: relancer avec un prompt modifié (depuis FeedbackAssistant)
  async function handleFeedbackRetry(newPrompt: string) {
    setShowFeedback(false)
    setFeedbackContext(null)
    setChatMessages(prev => [...prev, { role: 'user', content: newPrompt }])
    setSending(true)
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: agent.type, message: newPrompt, trigger: 'manual' }),
      })
      const data = await res.json()
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${data.error}` }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion' }])
    } finally {
      setSending(false)
    }
  }

  function handlePreferenceSaved() {
    setShowFeedback(false)
    setFeedbackContext(null)
  }

  async function refreshPendingActions() {
    try {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Main content */}
      <div className="lg:col-span-2">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-100 rounded-lg p-1 mb-4">
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
                    ? 'bg-white text-ink-700 shadow-sm'
                    : 'text-ink-400 hover:text-ink-600'
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
          <div className="card p-0 flex flex-col" style={{ height: '500px' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (() => {
                const agentConfig = getAgentConfig(agent.type)
                return (
                  <div className="flex flex-col items-center py-6 px-2">
                    <AgentAvatar type={agent.type} size="lg" />
                    <div className="text-center mt-4 mb-6">
                      <p className="text-sm text-ink-600 leading-relaxed max-w-sm">
                        Bonjour ! Je suis <span className="font-semibold">{agent.name}</span>, {agentConfig.role.toLowerCase()}.
                        Comment puis-je vous aider ?
                      </p>
                    </div>
                    {agentConfig.promptSuggestions.length > 0 && (
                      <div className="w-full max-w-md">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                          <p className="text-xs font-medium text-ink-300">Suggestions</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {agentConfig.promptSuggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => setMessage(suggestion)}
                              className="bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl px-4 py-3 text-sm text-ink-500 text-left transition-all hover:shadow-soft"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-100 text-ink-700'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-surface-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-ink-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {agent.name} réfléchit...
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Feedback Assistant — apparaît quand l'utilisateur est insatisfait */}
            {showFeedback && feedbackContext && (
              <FeedbackAssistant
                agentType={agent.type}
                agentName={agent.name}
                userMessage={feedbackContext.userMessage}
                agentResponse={feedbackContext.agentResponse}
                dissatisfactionMessage={feedbackContext.dissatisfactionMessage}
                onRetry={handleFeedbackRetry}
                onPreferenceSaved={handlePreferenceSaved}
                onDismiss={() => { setShowFeedback(false); setFeedbackContext(null) }}
              />
            )}

            <form onSubmit={sendMessage} className="p-4 border-t border-surface-100 flex gap-2">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Parler à ${agent.name}...`}
                disabled={sending || !agent.active}
                className="flex-1 input"
              />
              <button
                type="submit"
                disabled={sending || !message.trim() || !agent.active}
                className="px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Logs tab */}
        {activeTab === 'logs' && (
          <div className="card p-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <p className="text-ink-400 text-center py-8">Aucun log</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      log.status === 'success' ? 'bg-emerald-500' :
                      log.status === 'error' ? 'bg-red-500' :
                      log.status === 'warning' ? 'bg-amber-500' :
                      'bg-brand-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-700">{log.action}</p>
                      {log.payload_summary && (
                        <p className="text-xs text-ink-400 mt-0.5">{log.payload_summary}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-ink-300">
                        {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                      </p>
                      {log.tokens_used > 0 && (
                        <p className="text-xs text-ink-200">{log.tokens_used} tokens</p>
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
          <div className="card p-4">
            {pendingActions.length === 0 ? (
              <p className="text-ink-400 text-center py-8">Aucune action en attente</p>
            ) : (
              <div className="space-y-4">
                {pendingActions.map(action => (
                  <div key={action.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="font-semibold text-ink-700">{action.title}</h4>
                        </div>
                        <p className="text-sm text-ink-500 mt-1">{action.description}</p>
                        <p className="text-xs text-ink-300 mt-2">
                          Type: {action.action_type} · {new Date(action.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {action.payload && Object.keys(action.payload).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-600">
                          Voir les détails
                        </summary>
                        <pre className="mt-2 p-3 bg-white rounded-lg text-xs text-ink-500 overflow-x-auto">
                          {JSON.stringify(action.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAction(action.id, 'approve')}
                        disabled={approvingId === action.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
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
        <div className="card">
          <h3 className="font-semibold text-ink-700 mb-4">Statistiques (7j)</h3>
          <div className="space-y-3">
            {[
              { label: 'Total actions', value: logs.filter(l => l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length, color: 'text-brand-500' },
              { label: 'Succès', value: logs.filter(l => l.status === 'success' && l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length, color: 'text-emerald-600' },
              { label: 'Erreurs', value: logs.filter(l => l.status === 'error' && l.created_at > new Date(Date.now() - 7 * 86400000).toISOString()).length, color: 'text-red-600' },
              { label: 'En attente', value: pendingActions.length, color: 'text-amber-600' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-sm text-ink-400">{stat.label}</span>
                <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens used */}
        <div className="card">
          <h3 className="font-semibold text-ink-700 mb-4">Consommation</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">Tokens (7j)</span>
              <span className="font-semibold text-ink-700">
                {logs
                  .filter(l => l.created_at > new Date(Date.now() - 7 * 86400000).toISOString())
                  .reduce((sum, l) => sum + (l.tokens_used || 0), 0)
                  .toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">Temps moyen</span>
              <span className="font-semibold text-ink-700">
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
