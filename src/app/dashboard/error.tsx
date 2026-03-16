'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-ink-700 mb-2">Erreur</h2>
        <p className="text-ink-400 mb-6 text-sm">
          {error.message || 'Une erreur est survenue. Veuillez réessayer.'}
        </p>
        <button
          onClick={reset}
          className="btn-brand inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    </div>
  )
}
