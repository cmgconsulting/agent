'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { X, CheckCircle, AlertTriangle, Info, Bot } from 'lucide-react'
import type { AgentType } from '@/types/database'
import { AgentAvatar } from '@/components/agents/agent-avatars'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'agent'

export interface ToastOptions {
  title: string
  message?: string
  type?: ToastType
  duration?: number // ms, default 5000
  agentType?: AgentType // only for type === 'agent'
}

interface Toast extends ToastOptions {
  id: string
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─────────────────────────────────────────────
// Icon map
// ─────────────────────────────────────────────

function ToastIcon({ type }: { type: ToastType }) {
  const cls = 'w-5 h-5 flex-shrink-0'
  switch (type) {
    case 'success': return <CheckCircle className={`${cls} text-emerald-500`} />
    case 'error':   return <AlertTriangle className={`${cls} text-red-500`} />
    case 'warning': return <AlertTriangle className={`${cls} text-amber-500`} />
    case 'info':    return <Info className={`${cls} text-blue-500`} />
    case 'agent':   return <Bot className={`${cls} text-brand-500`} />
  }
}

function toastBorderColor(type: ToastType): string {
  switch (type) {
    case 'success': return 'border-l-emerald-400'
    case 'error':   return 'border-l-red-400'
    case 'warning': return 'border-l-amber-400'
    case 'info':    return 'border-l-blue-400'
    case 'agent':   return 'border-l-brand-400'
  }
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = options.duration ?? 5000
    const toast: Toast = { ...options, id, type: options.type ?? 'info' }

    setToasts(prev => {
      const next = [...prev, toast]
      // Evict oldest if over max
      if (next.length > MAX_TOASTS) {
        const removed = next.shift()!
        const timer = timersRef.current.get(removed.id)
        if (timer) { clearTimeout(timer); timersRef.current.delete(removed.id) }
      }
      return next
    })

    // Auto-dismiss
    const timer = setTimeout(() => removeToast(id), duration)
    timersRef.current.set(id, timer)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-96 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white rounded-2xl shadow-hover border border-surface-200 border-l-4 ${toastBorderColor(toast.type!)} p-4 flex items-start gap-3 animate-slide-in-right`}
          >
            {/* Icon or AgentAvatar */}
            {toast.type === 'agent' && toast.agentType ? (
              <div className="flex-shrink-0">
                <AgentAvatar type={toast.agentType} size="sm" />
              </div>
            ) : (
              <ToastIcon type={toast.type!} />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-700 leading-snug">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-ink-400 mt-0.5 leading-relaxed line-clamp-2">{toast.message}</p>
              )}
            </div>

            {/* Close */}
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-surface-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
