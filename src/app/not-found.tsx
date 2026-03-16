import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center">
      <div className="text-center max-w-md px-4 animate-fade-in">
        {/* Illustration */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-brand-50 flex items-center justify-center">
          <Search className="w-12 h-12 text-brand-300" />
        </div>
        <div className="text-6xl font-bold text-surface-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-ink-700 mb-2">Page introuvable</h1>
        <p className="text-ink-300 mb-8">
          Cette page n&apos;existe pas ou a été déplacée. Pas d&apos;inquiétude, retournez à l&apos;accueil.
        </p>
        <Link
          href="/"
          className="btn-brand inline-flex items-center gap-2"
        >
          <Home className="w-5 h-5" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
