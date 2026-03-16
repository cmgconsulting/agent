'use client'

import { CheckCircle, AlertCircle, WifiOff, Loader2 } from 'lucide-react'

interface CRMConnectorCardProps {
  type: string
  name: string
  description: string
  logo: string
  color: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  lastSyncAt?: string | null
  onConnect: () => void
  onManage: () => void
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'a l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

const statusConfig = {
  connected: {
    label: 'Connecte',
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700',
    dotClassName: 'bg-emerald-400',
  },
  disconnected: {
    label: 'Non connecte',
    icon: WifiOff,
    className: 'bg-surface-100 text-ink-300',
    dotClassName: 'bg-ink-200',
  },
  error: {
    label: 'Erreur',
    icon: AlertCircle,
    className: 'bg-red-50 text-red-700',
    dotClassName: 'bg-red-400',
  },
  syncing: {
    label: 'Synchronisation...',
    icon: Loader2,
    className: 'bg-blue-50 text-blue-700',
    dotClassName: 'bg-blue-400',
  },
}

export function CRMConnectorCard({
  name,
  description,
  logo,
  color,
  status,
  lastSyncAt,
  onConnect,
  onManage,
}: CRMConnectorCardProps) {
  const statusInfo = statusConfig[status]
  const StatusIcon = statusInfo.icon

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-surface-100 p-5 hover:shadow-card transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${color}15` }}
          >
            {logo}
          </div>
          <div>
            <h3 className="font-bold text-ink-700">{name}</h3>
            <p className="text-xs text-ink-300">{description}</p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
          {statusInfo.label}
        </span>
      </div>

      {/* Last sync */}
      {status === 'connected' && lastSyncAt && (
        <p className="text-xs text-ink-200 mb-4">
          Derniere sync : {formatRelativeTime(lastSyncAt)}
        </p>
      )}

      {/* Action button */}
      {status === 'connected' || status === 'syncing' || status === 'error' ? (
        <button
          onClick={onManage}
          className="w-full btn-secondary text-sm py-2.5"
        >
          Gerer
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="w-full btn-brand text-sm py-2.5"
        >
          Connecter
        </button>
      )}
    </div>
  )
}
