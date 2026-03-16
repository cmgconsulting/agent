'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, X } from 'lucide-react'

interface QuotaData {
  tokens_used: number
  tokens_quota: number
  percent_used: number
}

export function TokenQuotaAlert() {
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/billing/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.percent_used >= 80) {
          setQuota(data)
        }
      })
      .catch(() => {})
  }, [])

  if (!quota || dismissed) return null

  const isOver100 = quota.percent_used >= 100
  const isOver90 = quota.percent_used >= 90
  const bgColor = isOver100 ? 'bg-red-50 border-red-200' : isOver90 ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'
  const textColor = isOver100 ? 'text-red-700' : isOver90 ? 'text-orange-700' : 'text-amber-700'
  const iconColor = isOver100 ? 'text-red-500' : isOver90 ? 'text-orange-500' : 'text-amber-500'

  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl border ${bgColor} mb-6 animate-fade-in`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
        <span className={`text-sm font-medium ${textColor}`}>
          {isOver100
            ? `Quota atteint ! Vous avez utilisé ${quota.percent_used.toFixed(0)}% de vos tokens.`
            : `Attention : ${quota.percent_used.toFixed(0)}% de votre quota de tokens utilisé.`
          }
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/billing"
          className={`flex items-center gap-1 text-sm font-medium ${textColor} hover:underline`}
        >
          Voir les détails <ArrowUpRight className="w-3 h-3" />
        </Link>
        <button onClick={() => setDismissed(true)} className="text-ink-300 hover:text-ink-500 ml-2 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
