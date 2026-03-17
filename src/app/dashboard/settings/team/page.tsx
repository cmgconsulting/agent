'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Crown,
  Mail,
  Users,
  Send,
} from 'lucide-react'
import type { TeamRole } from '@/types/database'
import { PageHeader } from '@/components/ui/page-header'

// ─────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  role: TeamRole
  joined_at: string
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ROLE_CONFIG: Record<TeamRole, { label: string; classes: string }> = {
  owner: { label: 'Propriétaire', classes: 'bg-purple-100 text-purple-700' },
  manager: { label: 'Manager', classes: 'bg-blue-100 text-blue-700' },
  member: { label: 'Membre', classes: 'bg-emerald-100 text-emerald-700' },
  viewer: { label: 'Lecteur', classes: 'bg-surface-100 text-ink-500' },
}

const INVITABLE_ROLES: { value: TeamRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Membre' },
  { value: 'viewer', label: 'Lecteur' },
]

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  const source = name || email
  return source
    .split(' ')
    .map(p => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────
// Avatar circle
// ─────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-brand-400',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function MemberAvatar({ member }: { member: TeamMember }) {
  const initials = getInitials(member.full_name, member.email)
  const colorClass = getAvatarColor(member.id)

  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${colorClass}`}
    >
      {initials}
    </div>
  )
}

// ─────────────────────────────────────────────
// Invite modal
// ─────────────────────────────────────────────

interface InviteFormData {
  email: string
  full_name: string
  role: TeamRole
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (message: string) => void }) {
  const [form, setForm] = useState<InviteFormData>({
    email: '',
    full_name: '',
    role: 'member',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof InviteFormData>(key: K, value: InviteFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  async function handleSend() {
    if (!form.email.trim()) {
      setError("L'adresse email est requise.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("L'adresse email n'est pas valide.")
      return
    }
    if (!form.full_name.trim()) {
      setError('Le nom complet est requis.')
      return
    }

    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Erreur lors de l'envoi de l'invitation")
        return
      }
      onSuccess(`Invitation envoyée à ${form.email.trim()}`)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-card w-full max-w-md animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-brand-500" />
            </div>
            <h2 className="text-lg font-semibold text-ink-700">Inviter un membre</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-300 hover:text-ink-500 hover:bg-surface-100 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              Adresse email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="prenom.nom@entreprise.fr"
              className="input"
            />
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Prénom Nom"
              className="input"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-ink-600 mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value as TeamRole)}
              className="input"
            >
              {INVITABLE_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-ink-300 mt-1">
              Le rôle &quot;Propriétaire&quot; ne peut pas être assigné lors d&apos;une invitation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="btn-brand flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Envoi en cours...' : "Envoyer l'invitation"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/team/members')
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Erreur de chargement')
        return
      }
      setMembers(data.members || [])
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleInviteSuccess(message: string) {
    setShowInviteModal(false)
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Users className="w-5 h-5 text-brand-500" />}
        title="Équipe"
        subtitle="Gestion des membres et des accès"
        action={{ label: 'Inviter un membre', onClick: () => setShowInviteModal(true), icon: <Plus className="w-4 h-4" /> }}
      />

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-ink-300">
          <Loader2 className="w-7 h-7 animate-spin mr-3" />
          Chargement...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchMembers}
            className="ml-auto text-sm text-red-500 underline hover:text-red-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && members.length === 0 && (
        <div className="text-center py-20 bg-surface-50 rounded-2xl border-2 border-dashed border-surface-200">
          <Users className="w-12 h-12 text-surface-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink-500 mb-2">Aucun membre</h3>
          <p className="text-ink-300 text-sm mb-4">Invitez votre équipe pour collaborer sur la plateforme</p>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-brand inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Inviter un membre
          </button>
        </div>
      )}

      {/* Members table */}
      {!loading && !error && members.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-soft overflow-hidden">
          {/* Table header */}
          <div className="px-6 py-3 border-b border-surface-100 bg-surface-50 grid grid-cols-[2fr_2fr_1fr_1fr] gap-4">
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Membre</span>
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Email</span>
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Rôle</span>
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Rejoint le</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-surface-100">
            {members.map(member => {
              const roleCfg = ROLE_CONFIG[member.role]
              const isOwner = member.role === 'owner'

              return (
                <div
                  key={member.id}
                  className="px-6 py-4 grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 items-center hover:bg-surface-50 transition-colors"
                >
                  {/* Name + avatar */}
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar member={member} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink-700 truncate">
                          {member.full_name || '—'}
                        </span>
                        {isOwner && (
                          <span title="Propriétaire"><Crown className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" /></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
                    <span className="text-sm text-ink-500 truncate">{member.email}</span>
                  </div>

                  {/* Role badge */}
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleCfg.classes}`}>
                      {roleCfg.label}
                    </span>
                  </div>

                  {/* Joined date */}
                  <div>
                    <span className="text-sm text-ink-400">
                      {formatJoinDate(member.joined_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 border-t border-surface-100 bg-surface-50">
            <span className="text-xs text-ink-300">
              {members.length} membre{members.length !== 1 ? 's' : ''} au total
            </span>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  )
}
