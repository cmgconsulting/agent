'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TourStep {
  title: string
  description: string
  target: string // data-tour value
  illustration?: string // emoji
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface GuidedTourProps {
  steps: TourStep[]
  tourId: string
  onComplete?: () => void
}

// ─────────────────────────────────────────────
// Positioning logic
// ─────────────────────────────────────────────

function computeTooltipStyle(
  rect: DOMRect,
  position: TourStep['position']
): React.CSSProperties {
  const gap = 16
  const tooltipWidth = 380

  switch (position) {
    case 'right':
      return {
        top: Math.max(16, rect.top),
        left: rect.right + gap,
        maxWidth: tooltipWidth,
      }
    case 'left':
      return {
        top: Math.max(16, rect.top),
        right: window.innerWidth - rect.left + gap,
        maxWidth: tooltipWidth,
      }
    case 'top':
      return {
        bottom: window.innerHeight - rect.top + gap,
        left: Math.max(16, rect.left),
        maxWidth: tooltipWidth,
      }
    case 'bottom':
    default:
      return {
        top: rect.bottom + gap,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16)),
        maxWidth: tooltipWidth,
      }
  }
}

function bestPosition(rect: DOMRect): TourStep['position'] {
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceRight = window.innerWidth - rect.right
  if (spaceBelow > 260) return 'bottom'
  if (spaceRight > 420) return 'right'
  if (rect.top > 260) return 'top'
  return 'bottom'
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function GuidedTour({ steps, tourId, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const resizeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check if tour already completed
  useEffect(() => {
    try {
      const done = localStorage.getItem(`tour_${tourId}`)
      if (!done) {
        const timer = setTimeout(() => setIsVisible(true), 800)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable — show tour
      const timer = setTimeout(() => setIsVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [tourId])

  // Position tooltip near target element
  const positionTooltip = useCallback(() => {
    if (!isVisible) return
    const step = steps[currentStep]
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      const pos = step.position || bestPosition(rect)
      setTooltipStyle(computeTooltipStyle(rect, pos))
    } else {
      // Target not found — show centered
      setTargetRect(null)
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 420,
        width: '90%',
      })
    }
  }, [currentStep, isVisible, steps])

  useEffect(() => {
    positionTooltip()
  }, [positionTooltip])

  // Reposition on resize/scroll
  useEffect(() => {
    if (!isVisible) return
    function handleResize() {
      if (resizeRef.current) clearTimeout(resizeRef.current)
      resizeRef.current = setTimeout(positionTooltip, 100)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      if (resizeRef.current) clearTimeout(resizeRef.current)
    }
  }, [isVisible, positionTooltip])

  // Escape key
  useEffect(() => {
    if (!isVisible) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') completeTour()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  })

  const completeTour = useCallback(() => {
    try {
      localStorage.setItem(`tour_${tourId}`, 'done')
    } catch { /* ignore */ }
    setIsVisible(false)
    onComplete?.()
    // Persist to server
    fetch('/api/onboarding/tour-complete', { method: 'POST' }).catch(() => null)
  }, [tourId, onComplete])

  function nextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      completeTour()
    }
  }

  function prevStep() {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  if (!isVisible) return null

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <>
      {/* Overlay — with cutout for target */}
      <div className="fixed inset-0 z-[998] pointer-events-auto" onClick={completeTour}>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Spotlight on target */}
      {targetRect && (
        <div
          className="fixed z-[999] rounded-2xl ring-4 ring-brand-400/50 pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[1000] animate-slide-up"
        style={tooltipStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-hover p-6 border border-surface-100 relative">
          {/* Close */}
          <button
            onClick={completeTour}
            className="absolute top-4 right-4 text-ink-200 hover:text-ink-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress bar */}
          <div className="h-1 bg-surface-100 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicator */}
          <p className="text-xs text-ink-200 font-medium mb-3">
            Etape {currentStep + 1} sur {steps.length}
          </p>

          {/* Illustration */}
          {step.illustration && (
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-3">
              <span className="text-2xl">{step.illustration}</span>
            </div>
          )}

          {/* Content */}
          <h3 className="text-base font-bold text-ink-700 mb-2 pr-6">{step.title}</h3>
          <p className="text-sm text-ink-400 leading-relaxed mb-6">{step.description}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 0 ? (
                <button onClick={prevStep} className="btn-ghost flex items-center gap-1 text-sm">
                  <ArrowLeft className="w-4 h-4" />
                  Precedent
                </button>
              ) : (
                <button onClick={completeTour} className="btn-ghost text-sm text-ink-200">
                  Passer le guide
                </button>
              )}
            </div>
            <button onClick={nextStep} className="btn-brand flex items-center gap-2 text-sm py-2.5 px-5">
              {isLast ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  C&apos;est compris !
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// Pre-configured dashboard tour
// ─────────────────────────────────────────────

const DASHBOARD_STEPS: TourStep[] = [
  {
    target: 'sidebar-agents',
    title: 'Voici vos agents IA',
    description: 'Cliquez sur un agent pour lui parler et lui confier des taches. C\'est aussi simple qu\'envoyer un SMS !',
    illustration: '🤖',
    position: 'right',
  },
  {
    target: 'agent-cards',
    title: 'Chaque agent a sa specialite',
    description: 'Eva gere vos reseaux sociaux, Leo vos devis, Marc vos emails, Felix vos finances… Decouvrez ce que chacun peut faire pour vous.',
    illustration: '⭐',
    position: 'bottom',
  },
  {
    target: 'conversations-link',
    title: 'Retrouvez vos conversations ici',
    description: 'Comme un historique de SMS avec vos agents. Vous pouvez reprendre une discussion a tout moment.',
    illustration: '💬',
    position: 'right',
  },
  {
    target: 'sidebar-connectors',
    title: 'Connectez vos outils',
    description: 'Donnez plus de pouvoir a vos agents en connectant vos logiciels : email, Facebook, comptabilite… C\'est rapide et securise.',
    illustration: '🔌',
    position: 'right',
  },
  {
    target: 'sidebar-results',
    title: 'Suivez vos resultats',
    description: 'Voyez l\'impact reel de vos agents sur votre activite : temps gagne, leads generes, emails traites…',
    illustration: '📈',
    position: 'right',
  },
]

export function DashboardTour() {
  return <GuidedTour steps={DASHBOARD_STEPS} tourId="dashboard-welcome" />
}

// ─────────────────────────────────────────────
// Hook to trigger tour programmatically
// ─────────────────────────────────────────────

export function useTourReset(tourId: string) {
  return useCallback(() => {
    try {
      localStorage.removeItem(`tour_${tourId}`)
    } catch { /* ignore */ }
    // Force re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('tour:restart', { detail: { tourId } }))
  }, [tourId])
}

// Wrapper that listens for restart events
export function DashboardTourWrapper() {
  const [key, setKey] = useState(0)

  useEffect(() => {
    function handleRestart(e: Event) {
      const detail = (e as CustomEvent<{ tourId: string }>).detail
      if (detail.tourId === 'dashboard-welcome') {
        setKey(k => k + 1)
      }
    }
    window.addEventListener('tour:restart', handleRestart)
    return () => window.removeEventListener('tour:restart', handleRestart)
  }, [])

  return <GuidedTour key={key} steps={DASHBOARD_STEPS} tourId="dashboard-welcome" />
}
