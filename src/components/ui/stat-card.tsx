'use client'

import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { HelpTooltip } from './help-tooltip'

interface StatCardProps {
  icon: LucideIcon | ReactNode
  label: string
  value: string | number
  helpText?: string
  trend?: {
    value: number
    label: string
  }
  color?: 'brand' | 'green' | 'red' | 'blue' | 'orange'
}

const colorMap = {
  brand: {
    bg: 'bg-brand-50',
    icon: 'text-brand-500',
    trend: 'text-brand-600',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-500',
    trend: 'text-emerald-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-500',
    trend: 'text-red-600',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-500',
    trend: 'text-blue-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-500',
    trend: 'text-orange-600',
  },
}

function isLucideIcon(icon: LucideIcon | ReactNode): icon is LucideIcon {
  return typeof icon === 'function'
}

export function StatCard({ icon, label, value, helpText, trend, color = 'brand' }: StatCardProps) {
  const c = colorMap[color]

  const renderIcon = () => {
    if (isLucideIcon(icon)) {
      const Icon = icon
      return <Icon className={`w-5 h-5 ${c.icon}`} />
    }
    return icon
  }

  return (
    <div className="card animate-slide-up">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          {renderIcon()}
        </div>
        {helpText && <HelpTooltip text={helpText} />}
      </div>
      <p className="text-2xl font-bold text-ink-700 mt-3">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm text-ink-300">{label}</span>
        {trend && (
          <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}
