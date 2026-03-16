'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Share2,
  UserPlus,
  AtSign,
  Bot,
  CheckCheck,
  X,
  Loader2,
} from 'lucide-react'
import type { NotificationType, TeamNotification } from '@/types/database'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffSec < 60) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function getNotificationIcon(type: NotificationType) {
  const baseClass = 'w-4 h-4 flex-shrink-0'
  switch (type) {
    case 'share':
      return <Share2 className={`${baseClass} text-brand-500`} />
    case 'assignment':
      return <UserPlus className={`${baseClass} text-emerald-500`} />
    case 'mention':
      return <AtSign className={`${baseClass} text-purple-500`} />
    case 'agent_alert':
      return <Bot className={`${baseClass} text-orange-500`} />
    default:
      return <Bell className={`${baseClass} text-ink-300`} />
  }
}

function getNotificationHref(notification: TeamNotification): string | null {
  if (!notification.reference_type || !notification.reference_id) return null

  switch (notification.reference_type) {
    case 'task':
      return '/dashboard/tasks'
    case 'conversation':
      return `/dashboard/conversations`
    case 'workflow':
      return '/dashboard/workflows'
    case 'agent':
      return '/dashboard/agents'
    default:
      return null
  }
}

// ─────────────────────────────────────────────
// Notification item sub-component
// ─────────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: TeamNotification
  onMarkRead: (id: string) => void
}) {
  const router = useRouter()
  const href = getNotificationHref(notification)

  async function handleClick() {
    if (!notification.read) {
      onMarkRead(notification.id)
      await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      }).catch(() => null)
    }
    if (href) {
      router.push(href)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-colors duration-200 border-b border-surface-100 last:border-b-0 ${
        !notification.read ? 'bg-brand-50/40' : ''
      }`}
    >
      {/* Icon */}
      <div className="mt-0.5 w-7 h-7 rounded-xl bg-white border border-surface-200 shadow-soft flex items-center justify-center flex-shrink-0">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.read ? 'text-ink-500' : 'text-ink-700 font-medium'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-ink-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-ink-300 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-brand-400 flex-shrink-0" />
      )}
    </button>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<TeamNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // ── Fetch notifications ───────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?unread_only=false&limit=10')
      if (!res.ok) return
      const data = await res.json()
      const list: TeamNotification[] = data.notifications || []
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.read).length)
    } catch {
      // Silent — do not disrupt UI
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unread_only=true&limit=1')
      if (!res.ok) return
      const data = await res.json()
      setUnreadCount(data.total_unread ?? (data.notifications || []).length)
    } catch {
      // Silent
    }
  }, [])

  // ── Mount + listen for real-time updates from useNotificationsPoll ────────

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Listen for real-time unread count updates from the central poller
  useEffect(() => {
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent<{ unreadCount: number }>).detail
      setUnreadCount(detail.unreadCount)
    }
    window.addEventListener('notifications:update', handleUpdate)
    return () => window.removeEventListener('notifications:update', handleUpdate)
  }, [])

  // Fetch full list only when panel opens
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // ── Click outside to close ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // ── Escape key ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // ── Mark single as read (optimistic) ─────────────────────────────────────

  function handleMarkRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // ── Mark all as read ──────────────────────────────────────────────────────

  async function handleMarkAllRead() {
    if (markingAll) return
    setMarkingAll(true)

    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    } catch {
      // Revert on error
      fetchNotifications()
    } finally {
      setMarkingAll(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasUnread = unreadCount > 0

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          open
            ? 'bg-surface-100 text-ink-600'
            : 'text-ink-400 hover:bg-surface-100 hover:text-ink-600'
        }`}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge */}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-brand-400 text-ink-700 text-[10px] font-bold flex items-center justify-center px-1 leading-none ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-card border border-surface-200 z-50 flex flex-col overflow-hidden animate-slide-up"
          style={{ maxHeight: '480px' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-ink-500" />
              <h3 className="text-sm font-semibold text-ink-700">Notifications</h3>
              {hasUnread && (
                <span className="badge-brand">
                  {unreadCount} non lu{unreadCount > 1 ? 'es' : 'e'}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-xl text-ink-300 hover:text-ink-500 hover:bg-surface-100 transition-all duration-200"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10 text-ink-300">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Chargement...</span>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-300">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune notification</p>
                <p className="text-xs mt-1 text-ink-200">Vous êtes à jour !</p>
              </div>
            )}

            {!loading && notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>

          {/* Panel footer */}
          {!loading && notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-surface-100 bg-surface-50 flex items-center justify-between">
              <button
                onClick={handleMarkAllRead}
                disabled={!hasUnread || markingAll}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {markingAll
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCheck className="w-3.5 h-3.5" />
                }
                Tout marquer comme lu
              </button>
              <span className="text-xs text-ink-300">
                {notifications.length} affiché{notifications.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
