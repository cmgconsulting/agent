'use client'

import { RefreshCw, CheckCircle } from 'lucide-react'

interface CRMSyncStatusProps {
  crmName: string
  crmLogo: string
  crmColor: string
  lastSyncAt?: string | null
  contactsCount?: number
  devisCount?: number
  facturesCount?: number
}

export function CRMSyncStatus({
  crmName,
  crmLogo,
  crmColor,
  lastSyncAt,
  contactsCount = 0,
  devisCount = 0,
  facturesCount = 0,
}: CRMSyncStatusProps) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-surface-100 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${crmColor}15` }}
        >
          {crmLogo}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-700 truncate">{crmName}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle className="w-3 h-3" />
            Connecte
          </div>
        </div>
        <RefreshCw className="w-4 h-4 text-ink-200" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-surface-50 rounded-lg">
          <p className="text-lg font-bold text-ink-700">{contactsCount}</p>
          <p className="text-[10px] text-ink-300">Contacts</p>
        </div>
        <div className="text-center p-2 bg-surface-50 rounded-lg">
          <p className="text-lg font-bold text-ink-700">{devisCount}</p>
          <p className="text-[10px] text-ink-300">Devis</p>
        </div>
        <div className="text-center p-2 bg-surface-50 rounded-lg">
          <p className="text-lg font-bold text-ink-700">{facturesCount}</p>
          <p className="text-[10px] text-ink-300">Factures</p>
        </div>
      </div>

      {lastSyncAt && (
        <p className="text-[10px] text-ink-200 mt-2 text-center">
          Derniere sync : {new Date(lastSyncAt).toLocaleString('fr-FR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </div>
  )
}
