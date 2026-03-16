'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast-provider'
import type { TeamNotification, NotificationType } from '@/types/database'

const POLL_INTERVAL = 30_000 // 30 seconds

function toastTypeFromNotification(type: NotificationType): 'info' | 'warning' | 'agent' {
  switch (type) {
    case 'agent_alert': return 'agent'
    case 'assignment':  return 'warning'
    default:            return 'info'
  }
}

/**
 * Polls /api/notifications every 30s and shows a toast for each new notification.
 * Pauses when the tab is hidden and resumes when visible.
 * Returns the current unread count for use by other components.
 */
export function useNotificationsPoll(onUnreadCountChange?: (count: number) => void) {
  const { showToast } = useToast()
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unread_only=false&limit=10')
      if (!res.ok) return

      const data = await res.json()
      const notifications: TeamNotification[] = data.notifications || []
      const unreadCount: number = data.unread_count ?? 0

      onUnreadCountChange?.(unreadCount)

      // Dispatch custom event so NotificationBell can update its badge
      window.dispatchEvent(new CustomEvent('notifications:update', { detail: { unreadCount } }))

      if (!initializedRef.current) {
        // First poll: seed seen IDs without showing toasts
        notifications.forEach(n => seenIdsRef.current.add(n.id))
        initializedRef.current = true
        return
      }

      // Show toasts for new notifications
      for (const n of notifications) {
        if (!seenIdsRef.current.has(n.id)) {
          seenIdsRef.current.add(n.id)
          showToast({
            title: n.title,
            message: n.body || undefined,
            type: toastTypeFromNotification(n.type),
          })
        }
      }
    } catch {
      // Silent — don't disrupt UI
    }
  }, [showToast, onUnreadCountChange])

  // Start/stop polling based on tab visibility
  useEffect(() => {
    function startPolling() {
      if (intervalRef.current) return
      poll() // immediate poll on start
      intervalRef.current = setInterval(poll, POLL_INTERVAL)
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [poll])
}
