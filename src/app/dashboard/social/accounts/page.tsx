'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import type { SocialPlatform } from '@/types/database'

interface SocialAccountView {
  id: string
  platform: SocialPlatform
  platform_username: string | null
  display_name: string | null
  profile_image_url: string | null
  status: string
  last_error: string | null
  token_expires_at: string | null
  page_name: string | null
  connected_at: string
}

const PLATFORMS: { platform: SocialPlatform; label: string; color: string; bg: string }[] = [
  { platform: 'facebook', label: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { platform: 'instagram', label: 'Instagram', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  { platform: 'linkedin', label: 'LinkedIn', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  { platform: 'twitter', label: 'Twitter/X', color: 'text-ink-600', bg: 'bg-surface-50 border-surface-200' },
  { platform: 'tiktok', label: 'TikTok', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { platform: 'google_ads', label: 'Google Ads', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
]

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  active: { icon: CheckCircle, color: 'text-emerald-500', label: 'Actif' },
  expired: { icon: AlertTriangle, color: 'text-orange-500', label: 'Expiré' },
  error: { icon: XCircle, color: 'text-red-500', label: 'Erreur' },
  inactive: { icon: XCircle, color: 'text-ink-300', label: 'Inactif' },
}

export default function SocialAccountsPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccountView[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/social/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) setSuccessMsg(`${connected} connecté avec succès !`)
    if (error) setErrorMsg(decodeURIComponent(error))
  }, [load, searchParams])

  const connectPlatform = (platform: SocialPlatform) => {
    window.location.href = `/api/social/auth/${platform}/connect`
  }

  const disconnectAccount = async (accountId: string) => {
    if (!confirm('Déconnecter ce compte ?')) return
    const res = await fetch(`/api/social/accounts/${accountId}`, { method: 'DELETE' })
    if (res.ok) {
      setAccounts(prev => prev.filter(a => a.id !== accountId))
      setSuccessMsg('Compte déconnecté')
    }
  }

  const refreshToken = async (accountId: string) => {
    setRefreshing(accountId)
    try {
      const res = await fetch(`/api/social/accounts/${accountId}/refresh`, { method: 'POST' })
      if (res.ok) {
        setSuccessMsg('Token rafraîchi')
        load()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Échec refresh')
      }
    } catch {
      setErrorMsg('Erreur refresh')
    } finally {
      setRefreshing(null)
    }
  }

  const connectedPlatforms = new Set(accounts.map(a => a.platform))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Users}
        title="Comptes sociaux"
        subtitle="Connectez et gérez vos réseaux sociaux"
      />

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-500 hover:text-emerald-700 transition-colors">x</button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-500 hover:text-red-700 transition-colors">x</button>
        </div>
      )}

      {/* Connect new platforms */}
      <div className="card">
        <h2 className="section-title mb-4">Connecter un compte</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PLATFORMS.map(p => (
            <button
              key={p.platform}
              onClick={() => connectPlatform(p.platform)}
              className={`p-4 rounded-xl border text-center hover:shadow-card transition-all duration-200 ${p.bg}`}
            >
              <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
              {connectedPlatforms.has(p.platform) && (
                <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto mt-1" />
              )}
              {!connectedPlatforms.has(p.platform) && (
                <Plus className="h-4 w-4 text-ink-300 mx-auto mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Connected accounts */}
      <div className="card">
        <h2 className="section-title mb-4">Comptes connectés</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-ink-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-surface-200" />
            <p>Aucun compte connecté</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(account => {
              const statusCfg = STATUS_CONFIG[account.status] || STATUS_CONFIG.inactive
              const StatusIcon = statusCfg.icon

              return (
                <div key={account.id} className="flex items-center gap-4 p-4 border border-surface-200 rounded-xl hover:border-brand-200 transition-colors">
                  {account.profile_image_url ? (
                    <img src={account.profile_image_url} alt="" className="h-12 w-12 rounded-full" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-surface-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-ink-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-700">{account.display_name || account.platform_username || 'Sans nom'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-ink-400">
                        {PLATFORMS.find(p => p.platform === account.platform)?.label}
                      </span>
                      {account.page_name && (
                        <span className="text-xs text-ink-300">| Page: {account.page_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-4 w-4 ${statusCfg.color}`} />
                    <span className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => refreshToken(account.id)}
                      disabled={refreshing === account.id}
                      className="p-2 text-ink-300 hover:text-brand-500 rounded-xl hover:bg-brand-50 transition-all duration-200"
                      title="Rafraîchir le token"
                    >
                      {refreshing === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => disconnectAccount(account.id)}
                      className="p-2 text-ink-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all duration-200"
                      title="Déconnecter"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
