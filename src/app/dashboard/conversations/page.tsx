'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  ChevronDown,
  Settings,
  Share2,
  Download,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Check,
  X,
  MessageSquare,
  FileText,
  Mail,
  Presentation,
  Users,
  AlertCircle,
} from 'lucide-react'
import type {
  Conversation,
  Message,
  AgentType,
  PreferredTone,
  PreferredLength,
  ClientPreference,
} from '@/types/database'
import { AGENTS } from '@/lib/agents-config'
import { AgentAvatar } from '@/components/agents/agent-avatars'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationWithAgent extends Conversation {
  agentName: string
  agentRole: string
  lastMessage: string | null
}

interface MessageWithFeedback extends Message {
  localFeedback: 'positive' | 'negative' | null
  localComment: string
  showCommentBox: boolean
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string
}

interface FeedbackSummary {
  positive: number
  negative: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAgentConfig(type: AgentType) {
  return AGENTS.find(a => a.type === type) ?? AGENTS[0]
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function groupConversationsByDate(conversations: ConversationWithAgent[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const groups: { label: string; items: ConversationWithAgent[] }[] = [
    { label: "Aujourd'hui", items: [] },
    { label: 'Cette semaine', items: [] },
    { label: 'Ce mois', items: [] },
    { label: 'Plus ancien', items: [] },
  ]

  for (const conv of conversations) {
    const d = new Date(conv.updated_at)
    if (d >= startOfToday) {
      groups[0].items.push(conv)
    } else if (d >= startOfWeek) {
      groups[1].items.push(conv)
    } else if (d >= startOfMonth) {
      groups[2].items.push(conv)
    } else {
      groups[3].items.push(conv)
    }
  }

  return groups.filter(g => g.items.length > 0)
}

// ─── Agent badge colors ────────────────────────────────────────────────────────

const AGENT_BADGE: Record<AgentType, string> = {
  eva: 'bg-pink-100 text-pink-700',
  ludo: 'bg-brand-50 text-brand-700',
  marc: 'bg-orange-100 text-orange-700',
  leo: 'bg-emerald-100 text-emerald-700',
  hugo: 'bg-purple-100 text-purple-700',
  sofia: 'bg-teal-100 text-teal-700',
  felix: 'bg-red-100 text-red-700',
  iris: 'bg-indigo-100 text-indigo-700',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConversationsPage() {
  // Conversations list
  const [conversations, setConversations] = useState<ConversationWithAgent[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState<AgentType | 'all'>('all')

  // Selected conversation
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageWithFeedback[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Preferences panel
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<Partial<ClientPreference>>({
    preferred_tone: 'formel',
    preferred_length: 'detaille',
    custom_instructions: '',
    good_examples: [],
  })
  const [prefGoodExamples, setPrefGoodExamples] = useState('')
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Share modal
  const [showShare, setShowShare] = useState(false)
  const [shareWithTeam, setShareWithTeam] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [sharing, setSharing] = useState(false)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Feedback summary
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary>({ positive: 0, negative: 0 })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // ── Fetch conversations ──────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      if (agentFilter !== 'all') params.set('agent', agentFilter)
      if (searchQuery) params.set('q', searchQuery)
      const res = await fetch(`/api/conversations?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const enriched: ConversationWithAgent[] = (data.conversations ?? []).map(
          (c: Conversation & { agent_type?: AgentType; last_message?: string }) => {
            const agentType = (c.metadata as Record<string, string>)?.agent_type as AgentType | undefined
            const cfg = agentType ? getAgentConfig(agentType) : AGENTS[0]
            return {
              ...c,
              agentName: cfg.name,
              agentRole: cfg.role,
              lastMessage: c.last_message ?? (c.metadata as Record<string, string>)?.last_message ?? null,
            }
          }
        )
        setConversations(enriched)

        // Compute feedback summary across all loaded conversations
        const pos = enriched.reduce((s, c) => s + ((c.metadata as Record<string, number>)?.positive_count ?? 0), 0)
        const neg = enriched.reduce((s, c) => s + ((c.metadata as Record<string, number>)?.negative_count ?? 0), 0)
        setFeedbackSummary({ positive: pos, negative: neg })
      }
    } catch {
      // silent
    } finally {
      setLoadingList(false)
    }
  }, [agentFilter, searchQuery])

  useEffect(() => {
    const t = setTimeout(() => fetchConversations(), 300)
    return () => clearTimeout(t)
  }, [fetchConversations])

  // ── Fetch messages ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedId) return
    setLoadingMessages(true)
    fetch(`/api/conversations/${selectedId}/messages`)
      .then(r => r.json())
      .then(data => {
        const msgs: MessageWithFeedback[] = (data.messages ?? []).map((m: Message) => ({
          ...m,
          localFeedback: m.feedback ?? null,
          localComment: m.feedback_comment ?? '',
          showCommentBox: false,
        }))
        setMessages(msgs)
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [selectedId])

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus title input when editing starts
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

  // ── Selected conversation ────────────────────────────────────────────────────

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null
  const selectedAgentId = selectedConv
    ? ((selectedConv.metadata as Record<string, string>)?.agent_db_id ?? selectedConv.agent_id)
    : null
  const selectedAgentType =
    selectedConv
      ? ((selectedConv.metadata as Record<string, string>)?.agent_type as AgentType | undefined) ?? 'eva'
      : 'eva'

  function selectConversation(conv: ConversationWithAgent) {
    setSelectedId(conv.id)
    setShowPreferences(false)
    setShowShare(false)
    setShowExportMenu(false)
    setEditingTitle(false)
    setTitleDraft(conv.title ?? '')
  }

  // ── Title editing ────────────────────────────────────────────────────────────

  function startEditTitle() {
    setTitleDraft(selectedConv?.title ?? '')
    setEditingTitle(true)
  }

  async function saveTitle() {
    if (!selectedId || !titleDraft.trim()) {
      setEditingTitle(false)
      return
    }
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft.trim() }),
      })
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => (c.id === selectedId ? { ...c, title: titleDraft.trim() } : c))
        )
      }
    } catch {
      // silent
    }
    setEditingTitle(false)
  }

  function cancelEditTitle() {
    setEditingTitle(false)
    setTitleDraft(selectedConv?.title ?? '')
  }

  // ── Feedback ─────────────────────────────────────────────────────────────────

  async function submitFeedback(
    messageId: string,
    feedback: 'positive' | 'negative',
    comment?: string
  ) {
    try {
      await fetch(`/api/messages/${messageId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, feedback_comment: comment ?? '' }),
      })
    } catch {
      // silent
    }
  }

  function handleThumbsUp(messageId: string) {
    setMessages(prev =>
      prev.map(m => {
        if (m.id !== messageId) return m
        const newFeedback = m.localFeedback === 'positive' ? null : 'positive'
        submitFeedback(messageId, 'positive')
        return { ...m, localFeedback: newFeedback, showCommentBox: false }
      })
    )
  }

  function handleThumbsDown(messageId: string) {
    setMessages(prev =>
      prev.map(m => {
        if (m.id !== messageId) return m
        if (m.localFeedback === 'negative') {
          submitFeedback(messageId, 'negative', m.localComment)
          return { ...m, localFeedback: null, showCommentBox: false }
        }
        return { ...m, localFeedback: 'negative', showCommentBox: true }
      })
    )
  }

  function updateComment(messageId: string, comment: string) {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, localComment: comment } : m))
    )
  }

  function submitComment(messageId: string) {
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    submitFeedback(messageId, 'negative', msg.localComment)
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, showCommentBox: false } : m))
    )
  }

  // ── Preferences panel ────────────────────────────────────────────────────────

  async function openPreferences() {
    setShowPreferences(true)
    if (!selectedAgentId) return
    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/preferences`)
      if (res.ok) {
        const data = await res.json()
        const prefs: ClientPreference = data.preferences
        setPreferences(prefs)
        setPrefGoodExamples((prefs.good_examples ?? []).join('\n'))
      }
    } catch {
      // silent
    }
  }

  async function savePreferences() {
    if (!selectedAgentId) return
    setSavingPrefs(true)
    try {
      await fetch(`/api/agents/${selectedAgentId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preferences,
          good_examples: prefGoodExamples
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean),
        }),
      })
    } catch {
      // silent
    } finally {
      setSavingPrefs(false)
    }
  }

  // ── Share modal ──────────────────────────────────────────────────────────────

  async function openShare() {
    setShowShare(true)
    setShareWithTeam(false)
    setShareNote('')
    setSelectedMembers([])
    try {
      const res = await fetch('/api/team/members')
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.members ?? [])
      }
    } catch {
      // silent
    }
  }

  async function confirmShare() {
    if (!selectedId) return
    setSharing(true)
    try {
      await fetch(`/api/conversations/${selectedId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shared_with_team: shareWithTeam,
          shared_with_users: shareWithTeam ? [] : selectedMembers,
          note: shareNote,
        }),
      })
      setShowShare(false)
    } catch {
      // silent
    } finally {
      setSharing(false)
    }
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  async function handleExport(format: 'pdf' | 'docx' | 'pptx' | 'email') {
    if (!selectedId || !selectedConv) return
    setExporting(true)
    setShowExportMenu(false)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedId,
          format,
          title: selectedConv.title ?? 'Conversation',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (res.ok) {
        const contentType = res.headers.get('Content-Type') ?? ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          if (data.url) {
            const link = document.createElement('a')
            link.href = data.url
            link.download = `conversation_${selectedId}.${format}`
            link.click()
          }
        } else {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `conversation_${selectedId}.${format}`
          link.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch {
      // silent
    } finally {
      setExporting(false)
    }
  }

  // ── Filtered conversations ───────────────────────────────────────────────────

  const filtered = conversations.filter(c => {
    const q = searchQuery.toLowerCase()
    const matchQ =
      !q ||
      (c.title ?? '').toLowerCase().includes(q) ||
      (c.lastMessage ?? '').toLowerCase().includes(q)
    const convAgentType = (c.metadata as Record<string, string>)?.agent_type as AgentType | undefined
    const matchAgent = agentFilter === 'all' || convAgentType === agentFilter
    return matchQ && matchAgent
  })

  const grouped = groupConversationsByDate(filtered)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 bg-surface-50 border-r border-surface-200 flex flex-col">
        {/* Feedback summary */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-white rounded-xl border border-surface-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-ink-400 font-medium">Retours</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <ThumbsUp className="w-3.5 h-3.5" />
                {feedbackSummary.positive}
              </span>
              <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <ThumbsDown className="w-3.5 h-3.5" />
                {feedbackSummary.negative}
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        {/* Agent filter */}
        <div className="px-4 pb-3">
          <div className="relative">
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value as AgentType | 'all')}
              className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none"
            >
              <option value="all">Tous les agents</option>
              {AGENTS.map(a => (
                <option key={a.type} value={a.type}>
                  {a.name} — {a.role}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 pointer-events-none" />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex flex-col gap-2 px-4 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-ink-300">
              <MessageSquare className="w-8 h-8 mb-2" />
              <p className="text-sm">Aucune conversation</p>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.label}>
                <p className="px-4 py-1.5 text-xs font-semibold text-ink-300 uppercase tracking-wide">
                  {group.label}
                </p>
                {group.items.map(conv => {
                  const agentType = (conv.metadata as Record<string, string>)?.agent_type as AgentType | undefined
                  const isActive = conv.id === selectedId
                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full text-left px-4 py-3 border-b border-surface-100 transition-colors hover:bg-brand-50 ${
                        isActive ? 'bg-brand-100' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ink-700 truncate flex-1">
                          {conv.title ?? 'Conversation sans titre'}
                        </p>
                        <span className="text-xs text-ink-300 flex-shrink-0">
                          {formatRelativeTime(conv.updated_at)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {agentType && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                              AGENT_BADGE[agentType] ?? 'bg-surface-100 text-ink-500'
                            }`}
                          >
                            {conv.agentName}
                          </span>
                        )}
                        <p className="text-xs text-ink-400 truncate">
                          {(conv.lastMessage ?? '').slice(0, 50) || 'Aucun message'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="flex-shrink-0 border-b border-surface-200 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: agent info + title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">
                    <AgentAvatar type={selectedAgentType} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-700 text-sm">
                        {getAgentConfig(selectedAgentType).name}
                      </span>
                      <span className="text-xs text-ink-300">
                        {getAgentConfig(selectedAgentType).role}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          selectedConv.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-surface-100 text-ink-400'
                        }`}
                      >
                        {selectedConv.status === 'active' ? 'Actif' : 'Archivé'}
                      </span>
                    </div>

                    {/* Editable title */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {editingTitle ? (
                        <>
                          <input
                            ref={titleInputRef}
                            type="text"
                            value={titleDraft}
                            onChange={e => setTitleDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveTitle()
                              if (e.key === 'Escape') cancelEditTitle()
                            }}
                            className="text-sm border-b border-brand-400 focus:outline-none text-ink-700 bg-transparent w-56"
                          />
                          <button
                            onClick={saveTitle}
                            className="p-0.5 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEditTitle}
                            className="p-0.5 text-red-500 hover:text-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-ink-500 truncate max-w-xs">
                            {selectedConv.title ?? 'Conversation sans titre'}
                          </span>
                          <button
                            onClick={startEditTitle}
                            className="p-0.5 text-ink-300 hover:text-ink-500"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Gear / preferences */}
                  <button
                    onClick={openPreferences}
                    className="p-2 rounded-lg text-ink-400 hover:bg-surface-50 transition"
                    title="Préférences de l'agent"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {/* Share */}
                  <button
                    onClick={openShare}
                    className="btn-secondary text-sm py-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    Partager
                  </button>

                  {/* Export dropdown */}
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      onClick={() => setShowExportMenu(v => !v)}
                      disabled={exporting}
                      className="btn-secondary text-sm py-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Exporter
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-surface-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        {[
                          { format: 'pdf', label: 'PDF', icon: FileText },
                          { format: 'docx', label: 'Word (.docx)', icon: FileText },
                          { format: 'pptx', label: 'PowerPoint', icon: Presentation },
                          { format: 'email', label: 'Envoyer par email', icon: Mail },
                        ].map(({ format, label, icon: Icon }) => (
                          <button
                            key={format}
                            onClick={() => handleExport(format as 'pdf' | 'docx' | 'pptx' | 'email')}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:bg-surface-50 transition"
                          >
                            <Icon className="w-4 h-4 text-ink-300" />
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loadingMessages ? (
                <div className="flex flex-col gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="h-12 w-64 bg-surface-200 rounded-2xl animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-300">
                  <MessageSquare className="w-12 h-12 mb-3 text-ink-200" />
                  <p>Aucun message dans cette conversation</p>
                </div>
              ) : (
                messages
                  .filter(m => m.role !== 'system')
                  .map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] ${msg.role === 'user' ? '' : 'space-y-1'}`}>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm ${
                            msg.role === 'user'
                              ? 'bg-brand-500 text-white'
                              : 'bg-surface-100 text-ink-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>

                        {/* Feedback for assistant messages */}
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1 pl-1">
                            <button
                              onClick={() => handleThumbsUp(msg.id)}
                              title="Bonne réponse"
                              className={`p-1 rounded transition ${
                                msg.localFeedback === 'positive'
                                  ? 'text-emerald-600'
                                  : 'text-ink-300 hover:text-ink-500'
                              }`}
                            >
                              <ThumbsUp
                                className="w-3.5 h-3.5"
                                fill={msg.localFeedback === 'positive' ? 'currentColor' : 'none'}
                              />
                            </button>
                            <button
                              onClick={() => handleThumbsDown(msg.id)}
                              title="Mauvaise réponse"
                              className={`p-1 rounded transition ${
                                msg.localFeedback === 'negative'
                                  ? 'text-red-500'
                                  : 'text-ink-300 hover:text-ink-500'
                              }`}
                            >
                              <ThumbsDown
                                className="w-3.5 h-3.5"
                                fill={msg.localFeedback === 'negative' ? 'currentColor' : 'none'}
                              />
                            </button>
                            <span className="text-xs text-ink-200">
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        {/* Comment box on thumbs down */}
                        {msg.role === 'assistant' && msg.showCommentBox && (
                          <div className="mt-1 bg-white border border-red-200 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-ink-400">
                              Pourquoi cette réponse est insuffisante ?
                            </p>
                            <textarea
                              value={msg.localComment}
                              onChange={e => updateComment(msg.id, e.target.value)}
                              rows={3}
                              placeholder="Votre commentaire..."
                              className="w-full text-xs border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  setMessages(prev =>
                                    prev.map(m =>
                                      m.id === msg.id
                                        ? { ...m, showCommentBox: false, localFeedback: null }
                                        : m
                                    )
                                  )
                                }
                                className="text-xs text-ink-400 hover:text-ink-600"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => submitComment(msg.id)}
                                className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                              >
                                Envoyer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom notice */}
            <div className="flex-shrink-0 border-t border-surface-100 px-6 py-3">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-ink-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Les conversations sont enregistrées automatiquement lors de vos échanges avec les agents
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-ink-300 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-ink-200" />
            </div>
            <div className="text-center">
              <p className="font-medium text-ink-400">Sélectionnez une conversation</p>
              <p className="text-sm mt-1">Choisissez une conversation dans la liste pour afficher les messages</p>
            </div>
          </div>
        )}
      </div>

      {/* ── AGENT PREFERENCES PANEL ──────────────────────────────────────────── */}
      {showPreferences && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setShowPreferences(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-surface-200 shadow-2xl z-40 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h2 className="font-semibold text-ink-700">Préférences de l&apos;agent</h2>
                <p className="text-xs text-ink-300 mt-0.5">
                  {getAgentConfig(selectedAgentType).name} —{' '}
                  {getAgentConfig(selectedAgentType).role}
                </p>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-2 rounded-lg text-ink-300 hover:bg-surface-50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Ton préféré */}
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-2">
                  Ton préféré
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'formel', label: 'Formel' },
                      { value: 'decontracte', label: 'Décontracté' },
                      { value: 'technique', label: 'Technique' },
                    ] as { value: PreferredTone; label: string }[]
                  ).map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tone"
                        value={opt.value}
                        checked={preferences.preferred_tone === opt.value}
                        onChange={() =>
                          setPreferences(p => ({ ...p, preferred_tone: opt.value }))
                        }
                        className="accent-brand-500"
                      />
                      <span className="text-sm text-ink-600">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Longueur préférée */}
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-2">
                  Longueur préférée
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'concis', label: 'Concis' },
                      { value: 'detaille', label: 'Détaillé' },
                      { value: 'exhaustif', label: 'Exhaustif' },
                    ] as { value: PreferredLength; label: string }[]
                  ).map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="length"
                        value={opt.value}
                        checked={preferences.preferred_length === opt.value}
                        onChange={() =>
                          setPreferences(p => ({ ...p, preferred_length: opt.value }))
                        }
                        className="accent-brand-500"
                      />
                      <span className="text-sm text-ink-600">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instructions personnalisées */}
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1.5">
                  Instructions personnalisées
                </label>
                <textarea
                  value={preferences.custom_instructions ?? ''}
                  onChange={e =>
                    setPreferences(p => ({ ...p, custom_instructions: e.target.value }))
                  }
                  rows={4}
                  placeholder="Ex: Toujours proposer 3 options, utiliser des emojis en fin de phrase..."
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>

              {/* Exemples de bonnes réponses */}
              <div>
                <label className="block text-sm font-medium text-ink-600 mb-1.5">
                  Exemples de bonnes réponses
                </label>
                <p className="text-xs text-ink-300 mb-1.5">Un exemple par ligne</p>
                <textarea
                  value={prefGoodExamples}
                  onChange={e => setPrefGoodExamples(e.target.value)}
                  rows={5}
                  placeholder={'Exemple de réponse 1\nExemple de réponse 2'}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none font-mono"
                />
              </div>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-surface-100">
              <button
                onClick={savePreferences}
                disabled={savingPrefs}
                className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {savingPrefs ? 'Enregistrement...' : 'Enregistrer les préférences'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SHARE MODAL ──────────────────────────────────────────────────────── */}
      {showShare && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setShowShare(false)}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-hover w-full max-w-md pointer-events-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-brand-500" />
                  <h2 className="font-semibold text-ink-700">Partager la conversation</h2>
                </div>
                <button
                  onClick={() => setShowShare(false)}
                  className="p-1.5 rounded-lg text-ink-300 hover:bg-surface-50 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Toggle team */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-ink-400" />
                    <span className="text-sm font-medium text-ink-600">
                      Partager avec toute l&apos;équipe
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShareWithTeam(v => !v)
                      setSelectedMembers([])
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      shareWithTeam ? 'bg-brand-500' : 'bg-surface-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                        shareWithTeam ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                {/* Member selection */}
                {!shareWithTeam && teamMembers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-ink-600 mb-2">
                      Ou sélectionner des membres
                    </p>
                    <div className="max-h-44 overflow-y-auto space-y-1 border border-surface-100 rounded-xl p-2">
                      {teamMembers.map(member => (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => toggleMember(member.id)}
                            className="accent-brand-500 w-4 h-4"
                          />
                          <div>
                            <p className="text-sm text-ink-700">
                              {member.full_name ?? member.email}
                            </p>
                            {member.full_name && (
                              <p className="text-xs text-ink-300">{member.email}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-ink-600 mb-1.5">
                    Note (optionnel)
                  </label>
                  <textarea
                    value={shareNote}
                    onChange={e => setShareNote(e.target.value)}
                    rows={3}
                    placeholder="Ajouter un message..."
                    className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 pb-5">
                <button
                  onClick={() => setShowShare(false)}
                  className="flex-1 py-2.5 btn-ghost"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmShare}
                  disabled={sharing || (!shareWithTeam && selectedMembers.length === 0)}
                  className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-xl hover:bg-brand-600 disabled:opacity-50 transition"
                >
                  {sharing ? 'Partage...' : 'Confirmer le partage'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
