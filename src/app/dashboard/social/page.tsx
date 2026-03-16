'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Share2,
  Users,
  TrendingUp,
  FileText,
  Plus,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { SectionHelp } from '@/components/ui/help-tooltip'
import { PageHeader } from '@/components/ui/page-header'
import type { SocialPlatform } from '@/types/database'

interface AccountSummary {
  id: string
  platform: SocialPlatform
  display_name: string | null
  platform_username: string | null
  status: string
  profile_image_url: string | null
}

interface PostSummary {
  id: string
  platform: string
  content: string | null
  status: string
  published_at: string | null
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  tiktok: 'TikTok',
  google_ads: 'Google Ads',
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-sky-100 text-sky-700',
  twitter: 'bg-surface-100 text-ink-600',
  tiktok: 'bg-purple-100 text-purple-700',
  google_ads: 'bg-emerald-100 text-emerald-700',
}

export default function SocialOverviewPage() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [recentPosts, setRecentPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [accountsRes, postsRes] = await Promise.all([
          fetch('/api/social/accounts'),
          fetch('/api/social/posts?limit=5'),
        ])
        if (accountsRes.ok) {
          const data = await accountsRes.json()
          setAccounts(data.accounts || [])
        }
        if (postsRes.ok) {
          const data = await postsRes.json()
          setRecentPosts(data.posts || [])
        }
      } catch (e) {
        console.error('Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    )
  }

  const activeAccounts = accounts.filter(a => a.status === 'active').length
  const publishedPosts = recentPosts.filter(p => p.status === 'published').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Share2}
        title="Réseaux sociaux"
        subtitle="Gérez vos comptes, publications et performances"
        action={{ label: 'Publier', href: '/dashboard/social/publish', icon: Plus }}
      />
      <div className="flex items-center justify-between mb-4">
        <SectionHelp
          title="Comment gérer vos réseaux sociaux ?"
          description="Connectez vos comptes, publiez du contenu et suivez vos performances sur toutes vos plateformes."
          tips={[
            'Connectez vos comptes dans l\'onglet Comptes',
            'Utilisez la génération IA pour créer du contenu',
            'Suivez vos KPIs dans les Analytiques',
          ]}
        />
        <Link
          href="/dashboard/social/accounts"
          className="btn-secondary flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Comptes
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Comptes connectés</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{activeAccounts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-brand-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Total comptes</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{accounts.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Posts publiés</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">{publishedPosts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-400">Plateformes</p>
              <p className="text-2xl font-bold text-ink-700 mt-1">
                {new Set(accounts.map(a => a.platform)).size}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Comptes connectés</h2>
          <Link href="/dashboard/social/accounts" className="text-brand-500 text-sm hover:text-brand-600 font-medium transition-colors">
            Voir tout
          </Link>
        </div>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-ink-400">
            <Share2 className="h-12 w-12 mx-auto mb-3 text-surface-200" />
            <p>Aucun compte connecté</p>
            <Link
              href="/dashboard/social/accounts"
              className="text-brand-500 hover:text-brand-600 text-sm mt-2 inline-block font-medium"
            >
              Connecter un compte
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center gap-3 p-3 border border-surface-200 rounded-xl hover:border-brand-200 transition-colors">
                {account.profile_image_url ? (
                  <img src={account.profile_image_url} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-surface-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-ink-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ink-700 truncate">{account.display_name || account.platform_username || 'Sans nom'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[account.platform]}`}>
                    {PLATFORM_LABELS[account.platform]}
                  </span>
                </div>
                {account.status !== 'active' && (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Posts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Publications récentes</h2>
          <Link href="/dashboard/social/publish" className="text-brand-500 text-sm hover:text-brand-600 font-medium transition-colors">
            Nouvelle publication
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-ink-400 text-center py-8">Aucune publication</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 border border-surface-200 rounded-xl">
                <span className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[post.platform as SocialPlatform] || 'bg-surface-100 text-ink-600'}`}>
                  {PLATFORM_LABELS[post.platform as SocialPlatform] || post.platform}
                </span>
                <p className="flex-1 text-sm text-ink-500 truncate">{post.content || 'Sans contenu'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  post.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-surface-100 text-ink-500'
                }`}>
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/social/analytics" className="card-interactive">
          <TrendingUp className="h-6 w-6 text-brand-500 mb-2" />
          <h3 className="font-semibold text-ink-700">Analytiques</h3>
          <p className="text-sm text-ink-400 mt-1">Suivez vos performances</p>
          <ExternalLink className="h-4 w-4 text-ink-300 mt-2" />
        </Link>
        <Link href="/dashboard/social/campaigns" className="card-interactive">
          <FileText className="h-6 w-6 text-purple-500 mb-2" />
          <h3 className="font-semibold text-ink-700">Campagnes</h3>
          <p className="text-sm text-ink-400 mt-1">Gérez vos campagnes pub</p>
          <ExternalLink className="h-4 w-4 text-ink-300 mt-2" />
        </Link>
        <Link href="/dashboard/social/publish" className="card-interactive">
          <Plus className="h-6 w-6 text-emerald-500 mb-2" />
          <h3 className="font-semibold text-ink-700">Publier</h3>
          <p className="text-sm text-ink-400 mt-1">Créez et publiez du contenu</p>
          <ExternalLink className="h-4 w-4 text-ink-300 mt-2" />
        </Link>
      </div>
    </div>
  )
}
