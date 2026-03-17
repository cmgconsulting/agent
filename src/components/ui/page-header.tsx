'use client'

import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface PageHeaderProps {
  icon?: LucideIcon | ReactNode
  greeting?: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: LucideIcon | ReactNode
  }
}

function isLucideIcon(icon: LucideIcon | ReactNode): icon is LucideIcon {
  return typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon && 'render' in (icon as Record<string, unknown>))
}

export function PageHeader({ icon, greeting, title, subtitle, action }: PageHeaderProps) {
  const renderIcon = () => {
    if (!icon) return null
    if (isLucideIcon(icon)) {
      const Icon = icon
      return <Icon className="w-5 h-5 text-brand-500" />
    }
    return icon
  }

  const renderActionIcon = () => {
    if (!action?.icon) return null
    if (isLucideIcon(action.icon)) {
      const ActionIcon = action.icon
      return <ActionIcon className="w-4 h-4" />
    }
    return action.icon
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 animate-fade-in">
      <div className="min-w-0">
        {greeting && (
          <p className="text-sm text-ink-300 mb-1">{greeting}</p>
        )}
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              {renderIcon()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-700 truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-ink-300 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {action && (
        action.href ? (
          <a href={action.href} className="btn-brand flex items-center justify-center gap-2 flex-shrink-0 whitespace-nowrap text-sm">
            {renderActionIcon()}
            {action.label}
          </a>
        ) : (
          <button onClick={action.onClick} className="btn-brand flex items-center justify-center gap-2 flex-shrink-0 whitespace-nowrap text-sm">
            {renderActionIcon()}
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
