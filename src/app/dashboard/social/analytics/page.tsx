'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Users,
  Eye,
  Heart,
  Loader2,
} from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'
import type { SocialPlatform } from '@/types/database'

interface AnalyticsRow {
  id: string
  platform: string
  metric_date: string
  followers_count: number
  impressions: number
  reach: number
  engagement_rate: number
  likes: number
  comments: number
  shares: number
  clicks: number
  profile_views: number
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  tiktok: 'TikTok',
  google_ads: 'Google Ads',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  tiktok: '#000000',
  google_ads: '#4285F4',
}

export default function SocialAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const accountsRes = await fetch('/api/social/accounts')
        if (!accountsRes.ok) return

        const { accounts } = await accountsRes.json()
        if (!accounts?.length) return

        setAnalytics([])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredAnalytics = platformFilter === 'all'
    ? analytics
    : analytics.filter(a => a.platform === platformFilter)

  const totals = filteredAnalytics.reduce(
    (acc, row) => ({
      followers: acc.followers + (row.followers_count || 0),
      impressions: acc.impressions + (row.impressions || 0),
      engagement: acc.engagement + (row.likes || 0) + (row.comments || 0) + (row.shares || 0),
      reach: acc.reach + (row.reach || 0),
    }),
    { followers: 0, impressions: 0, engagement: 0, reach: 0 }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={TrendingUp}
        title="Analytiques"
        subtitle="Performances de vos réseaux sociaux"
      />
      <div className="flex items-center justify-between mb-4">
        <SectionHelp
          title="Comment fonctionnent les analytiques ?"
          description="Suivez les performances de vos réseaux sociaux avec des métriques détaillées synchronisées automatiquement."
          tips={[
            'Les données sont synchronisées toutes les heures',
            'Filtrez par plateforme pour des vues ciblées',
            'Comparez les performances entre plateformes',
          ]}
        />
        <select
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value)}
          className="input max-w-[220px]"
        >
          <option value="all">Toutes les plateformes</option>
          {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Followers total</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{totals.followers.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Impressions</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{totals.impressions.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Eye className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Engagement</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{totals.engagement.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Portée</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{totals.reach.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Table */}
      <div className="card">
        <h2 className="section-title mb-4">Métriques détaillées</h2>
        {filteredAnalytics.length === 0 ? (
          <div className="text-center py-12 text-ink-400">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-surface-200" />
            <p>Aucune donnée analytique disponible</p>
            <p className="text-sm mt-1 text-ink-300">Les analytics seront synchronisées automatiquement toutes les heures</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 px-3 text-ink-400 font-medium">Date</th>
                  <th className="text-left py-2 px-3 text-ink-400 font-medium">Plateforme</th>
                  <th className="text-right py-2 px-3 text-ink-400 font-medium">Followers</th>
                  <th className="text-right py-2 px-3 text-ink-400 font-medium">Impressions</th>
                  <th className="text-right py-2 px-3 text-ink-400 font-medium">Portée</th>
                  <th className="text-right py-2 px-3 text-ink-400 font-medium">Likes</th>
                  <th className="text-right py-2 px-3 text-ink-400 font-medium">Commentaires</th>
                  <th className="text-right py-2 px-3 text-ink-400 font-medium">Partages</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalytics.map(row => (
                  <tr key={row.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                    <td className="py-2 px-3 text-ink-600">{new Date(row.metric_date).toLocaleDateString('fr-FR')}</td>
                    <td className="py-2 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: PLATFORM_COLORS[row.platform] || '#666' }}
                      >
                        {PLATFORM_LABELS[row.platform as SocialPlatform] || row.platform}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-ink-600">{row.followers_count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-ink-600">{row.impressions.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-ink-600">{row.reach.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-ink-600">{row.likes.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-ink-600">{row.comments.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-ink-600">{row.shares.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Platform Comparison */}
      <div className="card">
        <h2 className="section-title mb-4">Comparaison par plateforme</h2>
        <p className="text-sm text-ink-400">Les graphiques recharts seront affichés ici une fois les données synchronisées.</p>
      </div>
    </div>
  )
}
