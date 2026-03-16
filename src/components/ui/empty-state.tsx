'use client'

import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon | ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  illustration?: 'rocket' | 'search' | 'chart' | 'team' | 'chat'
}

function Illustration({ type, className = '' }: { type: string; className?: string }) {
  const illustrations: Record<string, JSX.Element> = {
    rocket: (
      <svg viewBox="0 0 120 120" className={className} fill="none">
        <circle cx="60" cy="60" r="50" fill="#FFF9E0"/>
        <circle cx="60" cy="60" r="35" fill="#FFF3C2"/>
        <path d="M60 30L50 55h20L60 30z" fill="#FEC000"/>
        <rect x="54" y="55" width="12" height="20" rx="2" fill="#FEC000"/>
        <path d="M50 75l-6 10h8l-2-10zm20 0l6 10h-8l2-10z" fill="#E5AC00"/>
        <circle cx="60" cy="48" r="3" fill="white"/>
      </svg>
    ),
    search: (
      <svg viewBox="0 0 120 120" className={className} fill="none">
        <circle cx="60" cy="60" r="50" fill="#FFF9E0"/>
        <circle cx="52" cy="52" r="20" stroke="#FEC000" strokeWidth="4" fill="#FFF3C2"/>
        <line x1="66" y1="66" x2="85" y2="85" stroke="#FEC000" strokeWidth="4" strokeLinecap="round"/>
        <path d="M45 48a8 8 0 0112 0" stroke="#E5AC00" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 120 120" className={className} fill="none">
        <circle cx="60" cy="60" r="50" fill="#FFF9E0"/>
        <rect x="30" y="60" width="12" height="25" rx="3" fill="#FFF3C2"/>
        <rect x="48" y="45" width="12" height="40" rx="3" fill="#FEC000"/>
        <rect x="66" y="35" width="12" height="50" rx="3" fill="#E5AC00"/>
        <rect x="84" y="50" width="12" height="35" rx="3" fill="#FFF3C2"/>
        <path d="M30 90h72" stroke="#DDD9D0" strokeWidth="2"/>
      </svg>
    ),
    team: (
      <svg viewBox="0 0 120 120" className={className} fill="none">
        <circle cx="60" cy="60" r="50" fill="#FFF9E0"/>
        <circle cx="42" cy="48" r="10" fill="#FEC000"/>
        <circle cx="78" cy="48" r="10" fill="#FFF3C2"/>
        <circle cx="60" cy="42" r="12" fill="#E5AC00"/>
        <path d="M30 82c0-12 14-20 30-20s30 8 30 20" fill="#FFF3C2"/>
      </svg>
    ),
    chat: (
      <svg viewBox="0 0 120 120" className={className} fill="none">
        <circle cx="60" cy="60" r="50" fill="#FFF9E0"/>
        <rect x="28" y="35" width="50" height="35" rx="10" fill="#FEC000"/>
        <path d="M38 70l-5 12 15-8" fill="#FEC000"/>
        <circle cx="43" cy="52" r="3" fill="white"/>
        <circle cx="53" cy="52" r="3" fill="white"/>
        <circle cx="63" cy="52" r="3" fill="white"/>
        <rect x="55" y="45" width="38" height="28" rx="8" fill="#FFF3C2" stroke="#FEC000" strokeWidth="2"/>
      </svg>
    ),
  }

  return illustrations[type] || illustrations.rocket
}

function isLucideIcon(icon: LucideIcon | ReactNode): icon is LucideIcon {
  return typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon && 'render' in (icon as Record<string, unknown>))
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  illustration = 'rocket'
}: EmptyStateProps) {
  const renderIcon = () => {
    if (isLucideIcon(icon)) {
      const Icon = icon
      return <Icon className="w-5 h-5 text-brand-400" />
    }
    return icon
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <Illustration type={illustration} className="w-32 h-32 mb-6" />
      <div className="flex items-center gap-2 mb-2">
        {renderIcon()}
        <h3 className="text-lg font-bold text-ink-700">{title}</h3>
      </div>
      <p className="text-sm text-ink-300 text-center max-w-md mb-6">{description}</p>
      {(actionLabel && onAction) && (
        <button onClick={onAction} className="btn-brand">
          {actionLabel}
        </button>
      )}
      {(actionLabel && actionHref) && (
        <a href={actionHref} className="btn-brand inline-block">
          {actionLabel}
        </a>
      )}
    </div>
  )
}
