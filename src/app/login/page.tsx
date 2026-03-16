'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Eye, EyeOff, ArrowRight, Zap, Shield, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect. Vérifiez vos identifiants.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-700 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-80 h-80 bg-brand-400 rounded-full opacity-10 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-60 h-60 bg-brand-400 rounded-full opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-brand-300 rounded-full opacity-5 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo size="lg" className="[&_span]:text-white [&_.text-ink-400]:text-brand-200" />

          <div className="space-y-10">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Vos agents IA<br />
              <span className="text-brand-400">travaillent pour vous</span>
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-400/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Simple comme bonjour</h3>
                  <p className="text-ink-200 text-sm leading-relaxed">
                    Pas besoin d&apos;être expert en informatique. Vos agents comprennent vos besoins et agissent.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-400/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Vous gardez le contrôle</h3>
                  <p className="text-ink-200 text-sm leading-relaxed">
                    Chaque action est validée par vous avant publication. Rien ne se fait sans votre accord.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-400/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Des résultats visibles</h3>
                  <p className="text-ink-200 text-sm leading-relaxed">
                    Suivez en temps réel l&apos;impact de vos agents sur votre activité.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-ink-300 text-xs">
            CMG Consulting — Plateforme propulsée par l&apos;intelligence artificielle
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center bg-surface-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Logo size="lg" />
          </div>

          <div className="bg-white rounded-3xl shadow-card p-8 animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-ink-700">Bienvenue !</h1>
              <p className="text-ink-300 mt-2 text-sm">
                Connectez-vous pour accéder à vos agents IA
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-ink-600 mb-2">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input text-base"
                  placeholder="votre@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-ink-600 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input text-base pr-12"
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-200 hover:text-ink-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3 animate-fade-in">
                  <span className="text-red-400 text-lg leading-none">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-brand flex items-center justify-center gap-2 text-base py-4"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-ink-700/30 border-t-ink-700 rounded-full animate-spin" />
                    Connexion en cours...
                  </div>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-ink-200 mt-6">
            Besoin d&apos;aide ? Contactez votre administrateur CMG Consulting
          </p>
        </div>
      </div>
    </div>
  )
}
