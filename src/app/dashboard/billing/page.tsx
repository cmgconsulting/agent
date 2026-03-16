'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Coins,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DailyUsage {
  date: string
  agent_type: string
  total_tokens: number
  total_cost: number
  request_count: number
}

interface AgentBreakdown {
  agent_type: string
  input: number
  output: number
  total: number
  cost: number
  requests: number
}

interface PlanInfo {
  id: string
  name: string
  display_name: string
  monthly_token_quota: number
  price_monthly: number
  features: Record<string, boolean>
}

interface UsageData {
  tokens_used: number
  tokens_quota: number
  percent_used: number
  plan: PlanInfo | null
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  daily_usage: DailyUsage[]
  agent_breakdown: AgentBreakdown[]
  estimated_cost: number
}

interface AvailablePlan {
  id: string
  name: string
  display_name: string
  description: string
  monthly_token_quota: number
  price_monthly: number
  price_yearly: number | null
  max_agents: number
  max_documents: number
  max_connectors: number
  max_team_members: number
  features: Record<string, boolean>
}

interface Alert {
  id: string
  alert_type: string
  message: string
  threshold_percent: number | null
  is_read: boolean
  created_at: string
  suggested_plan_id: string | null
}

// ─── Agent labels ────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  eva: 'Eva (Social)',
  ludo: 'Ludo (SAV)',
  marc: 'Marc (Email)',
  leo: 'Léo (Ops)',
  hugo: 'Hugo (Marketing)',
  sofia: 'Sofia (SOP)',
  felix: 'Félix (Finance)',
  iris: 'Iris (Reporting)',
}

const AGENT_COLORS: Record<string, string> = {
  eva: '#8B5CF6',
  ludo: '#EC4899',
  marc: '#3B82F6',
  leo: '#F59E0B',
  hugo: '#10B981',
  sofia: '#6366F1',
  felix: '#EF4444',
  iris: '#14B8A6',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

// ─── Circular gauge component ────────────────────────────────────────────────

function TokenGauge({ used, quota, percent }: { used: number; quota: number; percent: number }) {
  const radius = 80
  const stroke = 12
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const clampedPercent = Math.min(percent, 100)
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference

  const color = percent >= 100 ? '#EF4444' : percent >= 90 ? '#F59E0B' : percent >= 80 ? '#F97316' : '#FEC000'

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg height={radius * 2} width={radius * 2}>
          <circle
            stroke="#F1F3F5"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{percent.toFixed(1)}%</span>
          <span className="text-xs text-ink-400">utilisé</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm text-ink-500">
          <span className="font-semibold text-ink-700">{formatTokens(used)}</span> / {formatTokens(quota)} tokens
        </p>
      </div>
    </div>
  )
}

// ─── Bar chart component (simple) ────────────────────────────────────────────

function DailyChart({ data }: { data: DailyUsage[] }) {
  const byDate: Record<string, Record<string, number>> = {}
  for (const row of data) {
    if (!byDate[row.date]) byDate[row.date] = {}
    byDate[row.date][row.agent_type] = (byDate[row.date][row.agent_type] || 0) + Number(row.total_tokens)
  }

  const dates = Object.keys(byDate).sort()
  const agents = Array.from(new Set(data.map(d => d.agent_type)))
  const maxVal = Math.max(...dates.map(d => Object.values(byDate[d]).reduce((s, v) => s + v, 0)), 1)

  if (dates.length === 0) {
    return <div className="text-center text-ink-300 py-8">Aucune donnée pour cette période</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 mb-4">
        {agents.map(a => (
          <div key={a} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: AGENT_COLORS[a] || '#9CA3AF' }} />
            <span className="text-ink-500">{AGENT_LABELS[a] || a}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1" style={{ height: 200 }}>
        {dates.slice(-30).map(date => {
          const total = Object.values(byDate[date]).reduce((s, v) => s + v, 0)
          const heightPercent = (total / maxVal) * 100
          return (
            <div key={date} className="flex-1 flex flex-col items-center group relative" style={{ minWidth: 8 }}>
              <div className="w-full flex flex-col-reverse rounded-t" style={{ height: `${heightPercent}%`, minHeight: total > 0 ? 2 : 0 }}>
                {agents.map(a => {
                  const val = byDate[date][a] || 0
                  const h = total > 0 ? (val / total) * 100 : 0
                  return (
                    <div
                      key={a}
                      style={{ height: `${h}%`, backgroundColor: AGENT_COLORS[a] || '#9CA3AF' }}
                    />
                  )
                })}
              </div>
              <div className="absolute bottom-full mb-1 bg-ink-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {formatTokens(total)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-ink-300 mt-1">
        <span>{dates.length > 0 && new Date(dates[Math.max(0, dates.length - 30)]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        <span>{dates.length > 0 && new Date(dates[dates.length - 1]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [plans, setPlans] = useState<AvailablePlan[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usageRes, plansRes, alertsRes] = await Promise.all([
        fetch('/api/billing/usage'),
        fetch('/api/billing/plans'),
        fetch('/api/billing/alerts'),
      ])
      if (usageRes.ok) setUsage(await usageRes.json())
      if (plansRes.ok) {
        const p = await plansRes.json()
        setPlans(p.plans || [])
      }
      if (alertsRes.ok) {
        const a = await alertsRes.json()
        setAlerts(a.alerts || [])
      }
    } catch (err) {
      console.error('Error fetching billing data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDismissAlert(alertId: string) {
    await fetch(`/api/billing/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_dismissed: true }),
    })
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  async function handleUpgradeRequest(planId: string) {
    setUpgradeLoading(planId)
    try {
      const res = await fetch('/api/billing/upgrade-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_plan_id: planId }),
      })
      if (res.ok) setUpgradeSuccess(true)
    } finally {
      setUpgradeLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-100 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-surface-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  const currentPlanName = usage?.plan?.name || ''

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        icon={Coins}
        title="Consommation & Facturation"
        subtitle="Suivez votre utilisation de tokens et gérez votre abonnement"
      />
      <div className="flex items-center justify-between mb-6">
        <SectionHelp
          title="Comment fonctionne la facturation ?"
          description="Suivez votre consommation de tokens et gérez votre abonnement."
          tips={[
            'La jauge indique votre utilisation par rapport au quota mensuel',
            'Les alertes apparaissent à 80%, 90% et 100% du quota',
            'Demandez un upgrade directement depuis cette page',
          ]}
        />
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-center justify-between p-4 rounded-lg border ${
              alert.alert_type.includes('100') ? 'bg-red-50 border-red-200' :
              alert.alert_type.includes('90') ? 'bg-orange-50 border-orange-200' :
              'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${
                  alert.alert_type.includes('100') ? 'text-red-500' :
                  alert.alert_type.includes('90') ? 'text-orange-500' :
                  'text-amber-500'
                }`} />
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
              <button
                onClick={() => handleDismissAlert(alert.id)}
                className="text-ink-300 hover:text-ink-500"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Gauge */}
        <div className="card flex items-center justify-center animate-slide-up">
          <TokenGauge
            used={usage?.tokens_used ?? 0}
            quota={usage?.tokens_quota ?? 1}
            percent={usage?.percent_used ?? 0}
          />
        </div>

        {/* Plan */}
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 text-ink-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Plan actuel</span>
          </div>
          <p className="text-2xl font-bold text-ink-700">{usage?.plan?.display_name || 'Aucun'}</p>
          <p className="text-sm text-ink-400 mt-1">
            {usage?.plan?.price_monthly ? `${usage.plan.price_monthly}€/mois` : '—'}
          </p>
          <p className="text-xs text-ink-300 mt-2">
            Cycle: {usage?.billing_cycle === 'yearly' ? 'annuel' : 'mensuel'}
          </p>
        </div>

        {/* Estimated cost */}
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 text-ink-400 mb-2">
            <Coins className="w-4 h-4" />
            <span className="text-sm">Coût estimé</span>
          </div>
          <p className="text-2xl font-bold text-ink-700">
            {(usage?.estimated_cost ?? 0).toFixed(2)}€
          </p>
          <p className="text-sm text-ink-400 mt-1">ce mois</p>
        </div>

        {/* Period */}
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 text-ink-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Période en cours</span>
          </div>
          <p className="text-sm font-medium text-ink-700">
            {usage?.current_period_start
              ? new Date(usage.current_period_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : '—'}
            {' → '}
            {usage?.current_period_end
              ? new Date(usage.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </p>
          <p className="text-xs text-ink-300 mt-2">
            Quota: {formatTokens(usage?.tokens_quota ?? 0)} tokens/mois
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily chart */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-ink-700 mb-4">Historique 30 jours</h2>
          <DailyChart data={usage?.daily_usage || []} />
        </div>

        {/* Agent breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-ink-700 mb-4">Par agent</h2>
          <div className="space-y-3">
            {(usage?.agent_breakdown || []).sort((a, b) => b.total - a.total).map(agent => {
              const pct = (usage?.tokens_used ?? 0) > 0
                ? (agent.total / (usage?.tokens_used ?? 1)) * 100
                : 0
              return (
                <div key={agent.agent_type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-ink-600">{AGENT_LABELS[agent.agent_type] || agent.agent_type}</span>
                    <span className="text-ink-400">{formatTokens(agent.total)}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: AGENT_COLORS[agent.agent_type] || '#9CA3AF',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-ink-300 mt-0.5">
                    <span>{agent.requests} requêtes</span>
                    <span>{agent.cost.toFixed(4)}€</span>
                  </div>
                </div>
              )
            })}
            {(usage?.agent_breakdown || []).length === 0 && (
              <p className="text-sm text-ink-300 text-center py-4">Aucune consommation</p>
            )}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-ink-700 mb-4">Plans disponibles</h2>
        {upgradeSuccess && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Demande d&apos;upgrade envoyée ! L&apos;administrateur reviendra vers vous.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isCurrent = plan.name === currentPlanName
            const isUpgrade = plans.findIndex(p => p.name === plan.name) > plans.findIndex(p => p.name === currentPlanName)
            return (
              <div
                key={plan.id}
                className={`card border-2 ${
                  isCurrent ? 'border-brand-400 ring-2 ring-brand-100' : 'border-surface-200'
                }`}
              >
                {isCurrent && (
                  <span className="inline-block text-xs font-semibold bg-brand-50 text-brand-600 px-2 py-0.5 rounded mb-3">
                    Plan actuel
                  </span>
                )}
                <h3 className="text-xl font-bold text-ink-700">{plan.display_name}</h3>
                <p className="text-3xl font-bold text-ink-700 mt-2">
                  {plan.price_monthly}€<span className="text-sm font-normal text-ink-400">/mois</span>
                </p>
                {plan.price_yearly && (
                  <p className="text-xs text-ink-300">ou {plan.price_yearly}€/an</p>
                )}
                <p className="text-sm text-ink-400 mt-3">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {formatTokens(plan.monthly_token_quota)} tokens/mois
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {plan.max_agents === -1 ? 'Agents illimités' : `${plan.max_agents} agents`}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {plan.max_documents === -1 ? 'Documents illimités' : `${plan.max_documents} documents`}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {plan.max_connectors === -1 ? 'Connecteurs illimités' : `${plan.max_connectors} connecteurs`}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {plan.max_team_members === -1 ? 'Membres illimités' : `${plan.max_team_members} membre${plan.max_team_members > 1 ? 's' : ''}`}
                  </li>
                </ul>
                {isUpgrade && !isCurrent && (
                  <button
                    onClick={() => handleUpgradeRequest(plan.id)}
                    disabled={upgradeLoading === plan.id}
                    className="mt-4 w-full btn-brand justify-center"
                  >
                    {upgradeLoading === plan.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                    Passer à ce plan
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
