'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Clock,
  Euro,
  ListChecks,
  TrendingUp,
  Download,
  Save,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'quarter'

interface WeeklyPoint {
  label: string
  hours_saved: number
  task_count: number
}

interface AgentBreakdown {
  agent_name: string
  agent_type: string
  task_count: number
  hours_saved: number
}

interface ROIData {
  period: Period
  hours_saved: number
  hours_saved_prev: number
  euros_saved: number
  task_count: number
  task_count_prev: number
  hourly_cost: number
  plan: string
  weekly_evolution: WeeklyPoint[]
  agent_breakdown: AgentBreakdown[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_COSTS: Record<string, number> = {
  starter: 29,
  pro: 79,
  enterprise: 199,
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Semaine',
  month: 'Mois',
  quarter: 'Trimestre',
}

const AGENT_COLORS: Record<string, string> = {
  eva: 'bg-pink-500',
  ludo: 'bg-brand-400',
  marc: 'bg-orange-500',
  leo: 'bg-emerald-500',
  hugo: 'bg-purple-500',
  sofia: 'bg-teal-500',
  felix: 'bg-red-500',
  iris: 'bg-indigo-500',
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-5 h-5 bg-surface-100 rounded" />
        <div className="h-3 w-32 bg-surface-100 rounded" />
      </div>
      <div className="h-8 w-24 bg-surface-100 rounded mb-2" />
      <div className="h-3 w-16 bg-surface-100 rounded" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-48 bg-surface-100 rounded mb-6" />
      <div className="flex items-end gap-3 h-32">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-surface-100 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEuros(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' €'
}

function formatHours(h: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(h) + ' h'
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((current - prev) / prev) * 100)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<ROIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ROI config state
  const [hourlyCost, setHourlyCost] = useState<number>(50)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  // Export state
  const [exporting, setExporting] = useState(false)

  // Supabase client (used only to get auth token for the fetch calls if needed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics/roi?period=${period}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Erreur ${res.status}`)
      }
      const json: ROIData = await res.json()
      setData(json)
      setHourlyCost(json.hourly_cost ?? 50)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function saveConfig() {
    setSavingConfig(true)
    setConfigSaved(false)
    setConfigError(null)
    try {
      const res = await fetch('/api/analytics/roi/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_cost: hourlyCost }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Erreur ${res.status}`)
      }
      setConfigSaved(true)
      await fetchData()
      setTimeout(() => setConfigSaved(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setConfigError(msg)
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/analytics/roi/export?format=csv&period=${period}`)
      if (!res.ok) throw new Error('Export échoué')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roi-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // silent — user sees nothing downloaded
    } finally {
      setExporting(false)
    }
  }

  // Computed values
  const subscriptionCost = data ? (PLAN_COSTS[data.plan] ?? 29) : 29
  const roiMultiplier = data && subscriptionCost > 0
    ? (data.euros_saved / subscriptionCost).toFixed(1)
    : null
  const hoursDelta = data ? pctChange(data.hours_saved, data.hours_saved_prev) : null
  const tasksDelta = data ? pctChange(data.task_count, data.task_count_prev) : null

  const maxBarHours = data?.weekly_evolution?.length
    ? Math.max(...data.weekly_evolution.map(p => p.hours_saved), 0.1)
    : 1
  const maxAgentTasks = data?.agent_breakdown?.length
    ? Math.max(...data.agent_breakdown.map(a => a.task_count), 1)
    : 1

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<TrendingUp className="w-5 h-5 text-brand-500" />}
        title="Analytiques ROI"
        subtitle="Mesurez le retour sur investissement de vos agents IA"
      />
      <div className="mb-6">
        <SectionHelp
          title="Comment fonctionne le calcul ROI ?"
          description="Mesurez le retour sur investissement de vos agents IA en heures économisées et en euros."
          tips={[
            'Configurez votre coût horaire pour un calcul précis',
            'Le ROI est comparé au coût de votre abonnement',
            'Exportez les données en CSV pour vos rapports',
          ]}
        />
      </div>
      <div className="flex justify-end mb-6">
        <button
          onClick={handleExport}
          disabled={exporting || loading || !!error}
          className="btn-secondary"
        >
          {exporting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exporter CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit mb-6">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition ${
              period === p
                ? 'bg-white text-ink-700 shadow-sm'
                : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 text-sm font-medium">Impossible de charger les données</p>
            <p className="text-red-500 text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="text-sm text-red-600 hover:text-red-800 font-medium underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Heures économisées */}
            <div className="card animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-brand-500" />
                </div>
                <span className="text-sm text-ink-400 leading-tight">
                  Heures économisées
                </span>
              </div>
              <p className="text-3xl font-bold text-ink-700">
                {data ? formatHours(data.hours_saved) : '--'}
              </p>
              {hoursDelta !== null && (
                <p className={`text-sm mt-1.5 font-medium ${hoursDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {hoursDelta >= 0 ? '+' : ''}{hoursDelta}% vs période précédente
                </p>
              )}
            </div>

            {/* Équivalent euros */}
            <div className="card animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Euro className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-ink-400 leading-tight">
                  Équivalent en euros
                </span>
              </div>
              <p className="text-3xl font-bold text-ink-700">
                {data ? formatEuros(data.euros_saved) : '--'}
              </p>
              <p className="text-xs text-ink-300 mt-1.5">
                Base {data ? data.hourly_cost : '50'} €/h
              </p>
            </div>

            {/* Nombre de tâches */}
            <div className="card animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ListChecks className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm text-ink-400 leading-tight">
                  Tâches effectuées
                </span>
              </div>
              <p className="text-3xl font-bold text-ink-700">
                {data ? data.task_count.toLocaleString('fr-FR') : '--'}
              </p>
              {tasksDelta !== null && (
                <p className={`text-sm mt-1.5 font-medium ${tasksDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tasksDelta >= 0 ? '+' : ''}{tasksDelta}% vs période précédente
                </p>
              )}
            </div>

            {/* ROI vs abonnement */}
            <div className="card animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm text-ink-400 leading-tight">
                  ROI vs abonnement
                </span>
              </div>
              <p className="text-3xl font-bold text-ink-700">
                {roiMultiplier !== null ? `x${roiMultiplier}` : '--'}
              </p>
              <p className="text-xs text-ink-300 mt-1.5">
                Abonnement {subscriptionCost} €/mois
              </p>
            </div>
          </>
        )}
      </div>

      {/* Weekly evolution chart */}
      <div className="card mb-6">
        <h2 className="text-base font-semibold text-ink-700 mb-5">
          Évolution des heures économisées
        </h2>
        {loading ? (
          <SkeletonChart />
        ) : !data || data.weekly_evolution.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-ink-300 text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <div className="flex items-end gap-3" style={{ height: '140px' }}>
            {data.weekly_evolution.map((point, idx) => {
              const heightPct = maxBarHours > 0
                ? Math.max(4, (point.hours_saved / maxBarHours) * 100)
                : 4
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-brand-400 rounded-t hover:bg-brand-500 transition-colors relative group"
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {point.hours_saved.toFixed(1)}h · {point.task_count} tâches
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-ink-300 text-center truncate w-full px-0.5">
                    {point.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Agent breakdown */}
      <div className="card mb-6">
        <h2 className="text-base font-semibold text-ink-700 mb-5">
          Contribution par agent
        </h2>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3 w-16 bg-surface-100 rounded flex-shrink-0" />
                <div className="flex-1 h-5 bg-surface-100 rounded" />
                <div className="h-3 w-8 bg-surface-100 rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : !data || data.agent_breakdown.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-ink-300 text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <div className="space-y-3">
            {[...data.agent_breakdown]
              .sort((a, b) => b.task_count - a.task_count)
              .map((agent, idx) => {
                const widthPct = maxAgentTasks > 0
                  ? Math.max(2, (agent.task_count / maxAgentTasks) * 100)
                  : 2
                const colorClass = AGENT_COLORS[agent.agent_type] ?? 'bg-ink-300'
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm text-ink-500 w-16 text-right flex-shrink-0 truncate">
                      {agent.agent_name}
                    </span>
                    <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-ink-600 w-10 flex-shrink-0 text-right">
                      {agent.task_count}
                    </span>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ROI Config */}
      <div className="card">
        <h2 className="text-base font-semibold text-ink-700 mb-1">
          Configuration du calcul ROI
        </h2>
        <p className="text-sm text-ink-400 mb-4">
          Renseignez votre coût horaire pour affiner le calcul de la valeur générée.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-ink-500 flex-shrink-0">
            Coût horaire moyen
          </label>
          <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden">
            <input
              type="number"
              min={1}
              max={999}
              value={hourlyCost}
              onChange={(e) => setHourlyCost(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400 border-0"
            />
            <span className="px-3 py-2 text-sm text-ink-400 bg-surface-50 border-l border-surface-200">
              €/h
            </span>
          </div>
          <button
            onClick={saveConfig}
            disabled={savingConfig}
            className="btn-brand text-sm"
          >
            {savingConfig ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </button>
          {configSaved && (
            <span className="text-sm text-emerald-600 font-medium">
              Sauvegardé !
            </span>
          )}
          {configError && (
            <span className="text-sm text-red-500">
              {configError}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
