'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Image as ImageIcon,
  Upload,
  Check,
  X,
  Palette,
  Type,
  Building2,
  Eye,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandingConfig {
  logo_url: string | null
  primary_color: string
  secondary_color: string
  font_family: string
  slogan: string
  address: string
  phone: string
  contact_email: string
  website: string
  legal_mentions: string
  company_name: string
}

const DEFAULT_CONFIG: BrandingConfig = {
  logo_url: null,
  primary_color: '#2563eb',
  secondary_color: '#7c3aed',
  font_family: 'Inter',
  slogan: '',
  address: '',
  phone: '',
  contact_email: '',
  website: '',
  legal_mentions: '',
  company_name: '',
}

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Lato',
  'Montserrat',
  'Open Sans',
  'Poppins',
]

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  type: ToastType
  message: string
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {t.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 opacity-70 hover:opacity-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Color Input ──────────────────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  const handleTextChange = (raw: string) => {
    setText(raw)
    // Accept when it's a valid 6-char hex
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(cleaned)
    }
  }

  const handleColorPicker = (v: string) => {
    setText(v)
    onChange(v)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink-600">{label}</label>
      <div className="flex items-center gap-3">
        {/* Color swatch + native picker */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer overflow-hidden"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => handleColorPicker(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        {/* Hex text input */}
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          maxLength={7}
          placeholder="#000000"
          className="flex-1 input font-mono"
        />
        {/* Live preview pill */}
        <div
          className="h-8 w-16 rounded-full border border-surface-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  )
}

// ─── Export Preview ───────────────────────────────────────────────────────────

function ExportPreview({ config, logoPreview }: { config: BrandingConfig; logoPreview: string | null }) {
  const displayLogo = logoPreview || config.logo_url

  return (
    <div
      className="rounded-xl overflow-hidden shadow-card border border-surface-200"
      style={{ fontFamily: `'${config.font_family}', sans-serif` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-4"
        style={{ backgroundColor: config.primary_color }}
      >
        {displayLogo ? (
          <img
            src={displayLogo}
            alt="Logo"
            className="h-10 w-10 rounded-lg object-contain bg-white p-1"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <div>
          <p className="text-white font-bold text-lg leading-tight">
            {config.company_name || 'Votre entreprise'}
          </p>
          {config.slogan && (
            <p className="text-white/80 text-xs">{config.slogan}</p>
          )}
        </div>
      </div>

      {/* Secondary accent line */}
      <div className="h-1.5" style={{ backgroundColor: config.secondary_color }} />

      {/* Body */}
      <div className="bg-white px-6 py-5">
        <h2 className="text-base font-semibold text-ink-700 mb-2">Rapport mensuel — Exemple</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          Voici un aperçu du rendu de vos documents exportés avec votre branding. Les couleurs, la
          typographie et vos informations de contact seront appliquées automatiquement.
        </p>

        {/* Color accent block */}
        <div
          className="mt-4 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: config.primary_color + '15',
            borderLeft: `3px solid ${config.primary_color}`,
            color: config.primary_color,
          }}
        >
          Performance : 94% des objectifs atteints ce mois-ci.
        </div>

        {/* Secondary accent block */}
        <div
          className="mt-3 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: config.secondary_color + '12',
            borderLeft: `3px solid ${config.secondary_color}`,
            color: config.secondary_color,
          }}
        >
          Prochaine étape : révision trimestrielle prévue le 15/04/2026.
        </div>
      </div>

      {/* Footer */}
      <div className="bg-surface-50 border-t border-surface-200 px-6 py-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-400">
          {config.phone && <span>📞 {config.phone}</span>}
          {config.contact_email && <span>✉️ {config.contact_email}</span>}
          {config.website && <span>🌐 {config.website}</span>}
        </div>
        {config.address && (
          <p className="text-xs text-ink-300 mt-1 whitespace-pre-line">{config.address}</p>
        )}
        {config.legal_mentions && (
          <p className="text-xs text-ink-200 mt-2 whitespace-pre-line leading-relaxed">
            {config.legal_mentions}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-700 mb-5">
        <Icon className="w-4 h-4 text-brand-500" />
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BrandingSettingsPage() {
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_CONFIG)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [toastCounter, setToastCounter] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = toastCounter + 1
    setToastCounter((c) => c + 1)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [toastCounter])

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  // ── Field helper ───────────────────────────────────────────────────────────

  const set = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/branding')
        if (res.ok) {
          const data: BrandingConfig = await res.json()
          setConfig((prev) => ({ ...prev, ...data }))
        }
      } catch {
        // Silent — use defaults
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ── Logo upload ────────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview
    const objectUrl = URL.createObjectURL(file)
    setLogoPreview(objectUrl)
    setUploadFeedback(null)
    setIsUploadingLogo(true)

    try {
      const fd = new FormData()
      fd.append('logo', file)

      const res = await fetch('/api/branding/logo', {
        method: 'POST',
        body: fd,
      })

      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          set('logo_url', data.url)
        }
        setUploadFeedback({ type: 'success', message: 'Logo uploadé avec succès' })
      } else {
        const err = await res.json().catch(() => ({}))
        setUploadFeedback({ type: 'error', message: err.error || 'Erreur lors de l\'upload' })
        setLogoPreview(null)
      }
    } catch {
      setUploadFeedback({ type: 'error', message: 'Erreur réseau — réessayez' })
      setLogoPreview(null)
    } finally {
      setIsUploadingLogo(false)
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (res.ok) {
        addToast('success', 'Branding enregistré avec succès')
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Erreur lors de la sauvegarde')
      }
    } catch {
      addToast('error', 'Erreur réseau — réessayez')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    )
  }

  const displayLogo = logoPreview || config.logo_url

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="max-w-5xl mx-auto pb-32 animate-fade-in">
        <PageHeader
          icon={Palette}
          title="Identité visuelle"
          subtitle="Configurez votre branding pour les exports de documents"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Left column — settings */}
          <div className="flex flex-col gap-6">

            {/* ── Section 1: Logo ── */}
            <Section icon={ImageIcon} title="Logo">
              <div className="flex items-center gap-6">
                {/* Preview */}
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-surface-200 flex items-center justify-center bg-surface-50 overflow-hidden flex-shrink-0">
                  {displayLogo ? (
                    <img
                      src={displayLogo}
                      alt="Logo actuel"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-ink-200" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="btn-brand"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploadingLogo ? 'Upload en cours...' : 'Changer le logo'}
                  </button>

                  <p className="text-xs text-ink-300">PNG, JPG, SVG — max 2 Mo</p>

                  {/* Upload feedback */}
                  {uploadFeedback && (
                    <div
                      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                        uploadFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {uploadFeedback.type === 'success' ? (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      {uploadFeedback.message}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ── Section 2: Couleurs ── */}
            <Section icon={Palette} title="Couleurs">
              <div className="flex flex-col gap-5">
                <ColorField
                  label="Couleur principale"
                  value={config.primary_color}
                  onChange={(v) => set('primary_color', v)}
                />
                <ColorField
                  label="Couleur secondaire"
                  value={config.secondary_color}
                  onChange={(v) => set('secondary_color', v)}
                />
              </div>
            </Section>

            {/* ── Section 3: Typographie ── */}
            <Section icon={Type} title="Typographie">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-ink-600">Police d&apos;écriture</label>
                <select
                  value={config.font_family}
                  onChange={(e) => set('font_family', e.target.value)}
                  className="input"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                {/* Preview */}
                <div
                  className="mt-2 p-4 rounded-lg bg-surface-50 border border-surface-200"
                  style={{ fontFamily: `'${config.font_family}', sans-serif` }}
                >
                  <p className="text-base font-semibold text-ink-600">
                    Aperçu — {config.font_family}
                  </p>
                  <p className="text-sm text-ink-400 mt-1">
                    The quick brown fox jumps over the lazy dog. 0123456789
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Section 4: Informations entreprise ── */}
            <Section icon={Building2} title="Informations de l'entreprise">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Slogan */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-600">Slogan / Tagline</label>
                  <input
                    type="text"
                    value={config.slogan}
                    onChange={(e) => set('slogan', e.target.value)}
                    placeholder="Votre slogan..."
                    className="input"
                  />
                </div>

                {/* Adresse */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-600">Adresse</label>
                  <textarea
                    value={config.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="12 rue de la Paix&#10;75001 Paris"
                    rows={3}
                    className="input resize-none"
                  />
                </div>

                {/* Telephone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-600">Téléphone</label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+33 1 23 45 67 89"
                    className="input"
                  />
                </div>

                {/* Email de contact */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-600">Email de contact</label>
                  <input
                    type="email"
                    value={config.contact_email}
                    onChange={(e) => set('contact_email', e.target.value)}
                    placeholder="contact@entreprise.fr"
                    className="input"
                  />
                </div>

                {/* Site web */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-600">Site web</label>
                  <input
                    type="url"
                    value={config.website}
                    onChange={(e) => set('website', e.target.value)}
                    placeholder="https://www.entreprise.fr"
                    className="input"
                  />
                </div>

                {/* Mentions légales */}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-ink-600">Mentions légales</label>
                  <textarea
                    value={config.legal_mentions}
                    onChange={(e) => set('legal_mentions', e.target.value)}
                    placeholder="SAS au capital de 10 000 € — SIRET 123 456 789 00010 — RCS Paris B 123 456 789"
                    rows={4}
                    className="input resize-none"
                  />
                </div>
              </div>
            </Section>
          </div>

          {/* Right column — live preview */}
          <div className="lg:sticky lg:top-6">
            <div className="card">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink-700 mb-4">
                <Eye className="w-4 h-4 text-brand-500" />
                Aperçu en temps réel
              </h2>
              <p className="text-xs text-ink-300 mb-4">
                Simulation d&apos;un export PDF avec votre branding
              </p>
              <ExportPreview config={config} logoPreview={logoPreview} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-200 shadow-lg">
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
          <p className="text-sm text-ink-400">
            Les modifications sont appliquées aux prochains exports de documents.
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-brand shadow-sm"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Enregistrement...' : 'Enregistrer le branding'}
          </button>
        </div>
      </div>
    </>
  )
}
