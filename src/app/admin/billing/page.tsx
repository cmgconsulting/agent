'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Coins,
  Users,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientBilling {
  client_id: string
  company_name: string
  plan_name: string
  plan_display: string
  tokens_used: number
  tokens_quota: number
  percent_used: number
  price_monthly: number
  status: string
  period_end: string
}

interface PlanStats {
  plan_name: string
  display_name: string
  count: number
  revenue: number
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default function AdminBillingPage() {
  const [clients, setClients] = useState<ClientBilling[]>([])
  const [planStats, setPlanStats] = useState<PlanStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<'percent_used' | 'company_name' | 'tokens_used'>('percent_used')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: subs } = await supabase
        .from('client_subscriptions')
        .select(`
          client_id,
          tokens_used,
          tokens_quota,
          status,
          current_period_end,
          billing_plans:plan_id (name, display_name, price_monthly)
        `)
        .order('tokens_used', { ascending: false })

      const { data: allClients } = await supabase
        .from('clients')
        .select('id, company_name')

      const clientMap: Record<string, string> = {}
      for (const c of allClients || []) {
        clientMap[c.id] = c.company_name
      }

      const mapped: ClientBilling[] = (subs || []).map((sub: Record<string, unknown>) => {
        const plan = sub.billing_plans as Record<string, unknown> | null
        const tokensUsed = Number(sub.tokens_used) || 0
        const tokensQuota = Number(sub.tokens_quota) || 1
        return {
          client_id: sub.client_id as string,
          company_name: clientMap[sub.client_id as string] || 'Inconnu',
          plan_name: (plan?.name as string) || '',
          plan_display: (plan?.display_name as string) || '',
          tokens_used: tokensUsed,
          tokens_quota: tokensQuota,
          percent_used: Math.round((tokensUsed / tokensQuota) * 100 * 100) / 100,
          price_monthly: Number(plan?.price_monthly) || 0,
          status: sub.status as string,
          period_end: sub.current_period_end as string,
        }
      })

      setClients(mapped)

      const statsMap: Record<string, PlanStats> = {}
      for (const c of mapped) {
        if (!statsMap[c.plan_name]) {
          statsMap[c.plan_name] = { plan_name: c.plan_name, display_name: c.plan_display, count: 0, revenue: 0 }
        }
        statsMap[c.plan_name].count++
        statsMap[c.plan_name].revenue += c.price_monthly
      }
      setPlanStats(Object.values(statsMap))
    } catch (err) {
      console.error('Admin billing fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...clients].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'company_name') return a.company_name.localeCompare(b.company_name) * mul
    return ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)) * mul
  })

  const totalRevenue = clients.reduce((s, c) => s + c.price_monthly, 0)
  const overQuotaCount = clients.filter(c => c.percent_used >= 80).length

  const SortIcon = ({ field }: { field: typeof sortKey }) => {
    if (sortKey !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-100 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        icon={<Coins className="w-5 h-5 text-brand-500" />}
        title="Facturation — Vue admin"
        subtitle="Consommation de tous les clients et revenus"
      />
      <div className="flex items-center justify-between mb-6">
        <SectionHelp
          title="Gestion de la facturation"
          description="Vue d'ensemble de la consommation de tokens et des revenus par client."
          tips={[
            'Triez les colonnes pour identifier les surconsommations',
            'Les clients à 80% ou plus sont signalés en orange',
            'Le MRR est calculé depuis les plans actifs',
          ]}
        />
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Clients abonnés</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{clients.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-brand-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Revenus mensuels</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{totalRevenue.toFixed(0)}€</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Coins className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Plan le plus populaire</p>
              <p className="text-lg font-bold text-ink-700 mt-1">
                {[...planStats].sort((a, b) => b.count - a.count)[0]?.display_name || '—'}
              </p>
              <p className="text-xs text-ink-300">{[...planStats].sort((a, b) => b.count - a.count)[0]?.count || 0} clients</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Surconsommation (≥80%)</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{overQuotaCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Plan breakdown */}
      <div className="card">
        <h2 className="section-title mb-4">Répartition par plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planStats.map(p => (
            <div key={p.plan_name} className="border border-surface-100 rounded-xl p-4">
              <p className="font-semibold text-ink-700">{p.display_name}</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{p.count} <span className="text-sm text-ink-400 font-normal">clients</span></p>
              <p className="text-sm text-ink-400">{p.revenue.toFixed(0)}€/mois de revenus</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clients table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-6 border-b border-surface-100">
          <h2 className="section-title">Consommation par client</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase cursor-pointer hover:text-ink-600"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-1">Client <SortIcon field="company_name" /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Plan</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase cursor-pointer hover:text-ink-600"
                  onClick={() => handleSort('tokens_used')}
                >
                  <div className="flex items-center gap-1">Tokens utilisés <SortIcon field="tokens_used" /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Quota</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase cursor-pointer hover:text-ink-600"
                  onClick={() => handleSort('percent_used')}
                >
                  <div className="flex items-center gap-1">Utilisation <SortIcon field="percent_used" /></div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink-400 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {sorted.map(c => (
                <tr key={c.client_id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-ink-700">{c.company_name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-600">
                      {c.plan_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-500">{formatTokens(c.tokens_used)}</td>
                  <td className="px-6 py-4 text-sm text-ink-500">{formatTokens(c.tokens_quota)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.percent_used >= 100 ? 'bg-red-500' :
                            c.percent_used >= 90 ? 'bg-orange-500' :
                            c.percent_used >= 80 ? 'bg-amber-500' :
                            'bg-brand-400'
                          }`}
                          style={{ width: `${Math.min(c.percent_used, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        c.percent_used >= 100 ? 'text-red-600' :
                        c.percent_used >= 80 ? 'text-amber-600' :
                        'text-ink-500'
                      }`}>
                        {c.percent_used.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      c.status === 'trial' ? 'bg-purple-100 text-purple-700' :
                      'bg-surface-100 text-ink-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-400">Aucun client abonné</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
