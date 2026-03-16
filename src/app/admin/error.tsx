'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function AdminError({
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
        <h2 className="text-xl font-bold text-ink-700 mb-2">Une erreur est survenue</h2>
        <p className="text-ink-400 mb-6 text-sm">
          {error.message || 'Quelque chose s\'est mal passé. Veuillez réessayer.'}
        </p>
        {error.digest && (
          <p className="text-xs text-ink-300 mb-4 font-mono">Code: {error.digest}</p>
        )}
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
