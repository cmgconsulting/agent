'use client'

import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon?: LucideIcon
  greeting?: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: LucideIcon
  }
}

export function PageHeader({ icon: Icon, greeting, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-in">
      <div>
        {greeting && (
          <p className="text-sm text-ink-300 mb-1">{greeting}</p>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-brand-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-ink-700">{title}</h1>
            {subtitle && (
              <p className="text-sm text-ink-300 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {action && (
        action.href ? (
          <a href={action.href} className="btn-brand flex items-center gap-2">
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </a>
        ) : (
          <button onClick={action.onClick} className="btn-brand flex items-center gap-2">
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
