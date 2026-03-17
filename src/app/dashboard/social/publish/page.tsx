'use client'

import { useState, useEffect } from 'react'
import {
  Send,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import type { SocialPlatform } from '@/types/database'

interface AccountOption {
  id: string
  platform: SocialPlatform
  display_name: string | null
  platform_username: string | null
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  tiktok: 'TikTok',
  google_ads: 'Google Ads',
}

export default function SocialPublishPage() {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('text')
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState('professionnel')
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/social/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts((data.accounts || []).filter((a: { status: string }) => a.status === 'active'))
      }
    }
    load()
  }, [])

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const generateContent = async () => {
    if (!aiTopic) return
    setGenerating(true)
    setResult(null)
    try {
      const platform = selectedAccounts.length > 0
        ? accounts.find(a => a.id === selectedAccounts[0])?.platform || 'facebook'
        : 'facebook'

      const res = await fetch('/api/social/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, topic: aiTopic, tone: aiTone }),
      })

      if (res.ok) {
        const data = await res.json()
        setContent(data.content)
      } else {
        setResult({ success: false, message: 'Erreur génération IA' })
      }
    } catch {
      setResult({ success: false, message: 'Erreur génération' })
    } finally {
      setGenerating(false)
    }
  }

  const publishPost = async () => {
    if (!content || selectedAccounts.length === 0) return
    setPublishing(true)
    setResult(null)

    try {
      const res = await fetch('/api/social/posts/multi-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          account_ids: selectedAccounts,
          post_type: postType,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const successes = data.results?.filter((r: { success: boolean }) => r.success).length || 0
        const failures = data.results?.filter((r: { success: boolean }) => !r.success).length || 0
        setResult({
          success: failures === 0,
          message: `${successes} publié(s)${failures > 0 ? `, ${failures} échec(s)` : ''}`,
        })
        if (failures === 0) {
          setContent('')
          setSelectedAccounts([])
        }
      } else {
        setResult({ success: false, message: 'Erreur publication' })
      }
    } catch {
      setResult({ success: false, message: 'Erreur publication' })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={<Send className="w-5 h-5 text-brand-500" />}
        title="Publier"
        subtitle="Créez et publiez du contenu sur vos réseaux sociaux"
      />

      {result && (
        <div className={`px-4 py-3 rounded-xl flex items-center gap-2 ${
          result.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Content editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Generation */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Génération IA
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="Sujet du post (ex: économie d'énergie avec un poêle à bois)"
                className="input flex-1"
              />
              <select
                value={aiTone}
                onChange={e => setAiTone(e.target.value)}
                className="input max-w-[160px]"
              >
                <option value="professionnel">Professionnel</option>
                <option value="decontracte">Décontracté</option>
                <option value="educatif">Éducatif</option>
                <option value="promotionnel">Promotionnel</option>
              </select>
              <button
                onClick={generateContent}
                disabled={generating || !aiTopic}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-all duration-200"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Générer'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="card">
            <h2 className="section-title mb-3">Contenu</h2>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              placeholder="Rédigez votre publication ici..."
              className="input resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-ink-300">{content.length} caractères</span>
              <div className="flex gap-2">
                <select
                  value={postType}
                  onChange={e => setPostType(e.target.value)}
                  className="px-3 py-1 border border-surface-200 rounded-xl text-xs bg-white text-ink-600"
                >
                  <option value="text">Texte</option>
                  <option value="image">Image</option>
                  <option value="video">Vidéo</option>
                  <option value="carousel">Carousel</option>
                </select>
                {postType !== 'text' && (
                  <button className="px-3 py-1 border border-surface-200 rounded-xl text-xs flex items-center gap-1 hover:bg-surface-50 text-ink-500 transition-colors">
                    <ImageIcon className="h-3 w-3" />
                    Ajouter média
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Account selection + publish */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-3">Comptes cibles</h2>
            {accounts.length === 0 ? (
              <p className="text-sm text-ink-400">Aucun compte actif</p>
            ) : (
              <div className="space-y-2">
                {accounts.map(account => (
                  <label
                    key={account.id}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedAccounts.includes(account.id) ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:bg-surface-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => toggleAccount(account.id)}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-ink-700">{account.display_name || account.platform_username}</p>
                      <p className="text-xs text-ink-400">{PLATFORM_LABELS[account.platform]}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={publishPost}
            disabled={publishing || !content || selectedAccounts.length === 0}
            className="btn-brand w-full flex items-center justify-center gap-2"
          >
            {publishing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5" />
                Publier ({selectedAccounts.length} compte{selectedAccounts.length > 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
