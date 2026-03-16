'use client'

import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'

export function RestartTourButton() {
  const router = useRouter()

  function handleRestart() {
    try {
      localStorage.removeItem('tour_dashboard-welcome')
    } catch { /* ignore */ }
    router.push('/dashboard')
    // Small delay to let the navigation happen, then trigger the tour
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tour:restart', { detail: { tourId: 'dashboard-welcome' } }))
    }, 500)
  }

  return (
    <button onClick={handleRestart} className="btn-brand flex items-center gap-2 text-sm flex-shrink-0">
      <RotateCcw className="w-4 h-4" />
      Revoir le guide
    </button>
  )
}
