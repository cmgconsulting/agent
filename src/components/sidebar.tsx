'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'
import { Logo } from '@/components/ui/logo'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import {
  LayoutDashboard, Users, Settings, LogOut, Bot, Plug,
  Rocket, FileText, Activity, BookOpen, Database,
  TrendingUp, GitBranch, MessageSquare, Palette, CheckSquare,
  UsersRound, Share2, Coins, ChevronRight, HelpCircle, Brain,
  Menu, X, Link2
} from 'lucide-react'

interface SidebarProps {
  role: UserRole
  userName: string
}

interface NavLink {
  href: string
  label: string
  icon: typeof LayoutDashboard
  helpText?: string
  category?: string
  dataTour?: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  const closeSidebar = useCallback(() => setIsOpen(false), [])

  const adminLinks: NavLink[] = [
    { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, category: 'principal' },
    { href: '/admin/clients', label: 'Clients', icon: Users, category: 'principal' },
    { href: '/admin/agents', label: 'Agents', icon: Bot, category: 'principal' },
    { href: '/admin/onboarding', label: 'Onboarding', icon: Rocket, category: 'gestion' },
    { href: '/admin/analytics', label: 'Analytics', icon: Activity, category: 'gestion' },
    { href: '/admin/billing', label: 'Facturation', icon: Coins, category: 'gestion' },
    { href: '/admin/logs', label: 'Logs système', icon: FileText, category: 'système' },
    { href: '/admin/docs', label: 'Documentation', icon: BookOpen, category: 'système' },
    { href: '/admin/settings', label: 'Paramètres', icon: Settings, category: 'système' },
  ]

  const clientLinks: NavLink[] = [
    {
      href: '/dashboard',
      label: 'Mon tableau de bord',
      icon: LayoutDashboard,
      helpText: 'Vue d\'ensemble de toute votre activité',
      category: 'principal'
    },
    {
      href: '/dashboard/agents',
      label: 'Mes agents IA',
      icon: Bot,
      helpText: 'Vos assistants intelligents qui travaillent pour vous',
      category: 'principal',
      dataTour: 'sidebar-agents',
    },
    {
      href: '/dashboard/conversations',
      label: 'Conversations',
      icon: MessageSquare,
      helpText: 'Discutez avec vos agents comme par SMS',
      category: 'principal',
      dataTour: 'conversations-link',
    },
    {
      href: '/dashboard/tasks',
      label: 'Tâches planifiées',
      icon: CheckSquare,
      helpText: 'Les tâches automatiques programmées par vos agents',
      category: 'outils'
    },
    {
      href: '/dashboard/workflows',
      label: 'Automatisations',
      icon: GitBranch,
      helpText: 'Des chaînes d\'actions automatiques entre vos agents',
      category: 'outils'
    },
    {
      href: '/dashboard/social',
      label: 'Réseaux sociaux',
      icon: Share2,
      helpText: 'Publiez et analysez vos posts Facebook, LinkedIn, etc.',
      category: 'outils'
    },
    {
      href: '/dashboard/knowledge',
      label: 'Base de connaissances',
      icon: Database,
      helpText: 'Les informations que vos agents utilisent pour travailler',
      category: 'données'
    },
    {
      href: '/dashboard/connectors',
      label: 'Connexions',
      icon: Plug,
      helpText: 'Connectez vos logiciels (CRM, email, etc.) à vos agents',
      category: 'données',
      dataTour: 'sidebar-connectors',
    },
    {
      href: '/dashboard/analytics',
      label: 'Résultats & ROI',
      icon: TrendingUp,
      helpText: 'L\'impact réel de vos agents sur votre chiffre d\'affaires',
      category: 'suivi',
      dataTour: 'sidebar-results',
    },
    {
      href: '/dashboard/billing',
      label: 'Ma consommation',
      icon: Coins,
      helpText: 'Combien vous utilisez vos agents et votre forfait',
      category: 'suivi'
    },
    {
      href: '/dashboard/settings/preferences',
      label: 'Préférences IA',
      icon: Brain,
      helpText: 'Personnalisez le comportement de vos agents pour qu\'ils s\'adaptent à vous',
      category: 'paramètres'
    },
    {
      href: '/dashboard/settings/branding',
      label: 'Mon identité visuelle',
      icon: Palette,
      helpText: 'Personnalisez les couleurs et le logo de vos exports',
      category: 'paramètres'
    },
    {
      href: '/dashboard/settings/crm',
      label: 'Connecteurs CRM',
      icon: Link2,
      helpText: 'Connectez votre logiciel de gestion (Axonaut, Obat, etc.)',
      category: 'paramètres'
    },
    {
      href: '/dashboard/settings/team',
      label: 'Mon équipe',
      icon: UsersRound,
      helpText: 'Invitez des collègues à utiliser la plateforme',
      category: 'paramètres'
    },
    {
      href: '/dashboard/docs',
      label: 'Aide & Guide',
      icon: BookOpen,
      helpText: 'Tutoriels et explications pour bien utiliser la plateforme',
      category: 'paramètres'
    },
  ]

  const links = role === 'admin' ? adminLinks : clientLinks

  // Group links by category
  const categories = links.reduce((acc, link) => {
    const cat = link.category || 'autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(link)
    return acc
  }, {} as Record<string, NavLink[]>)

  const categoryLabels: Record<string, string> = {
    principal: '',
    outils: 'Outils',
    données: 'Données',
    suivi: 'Suivi',
    paramètres: 'Paramètres',
    gestion: 'Gestion',
    système: 'Système',
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-surface-100">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          {/* Close button on mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-xl text-ink-300 hover:bg-surface-100 hover:text-ink-500 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-ink-200 mt-2 ml-1">
          {role === 'admin' ? 'Administration' : 'Espace client'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {Object.entries(categories).map(([cat, catLinks]) => (
          <div key={cat} className="mb-2">
            {categoryLabels[cat] && (
              <p className="text-[10px] font-bold text-ink-200 uppercase tracking-wider px-3 py-2 mt-2">
                {categoryLabels[cat]}
              </p>
            )}
            {catLinks.map((link) => {
              const isActive = pathname === link.href ||
                (link.href !== '/dashboard' && link.href !== '/admin' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeSidebar}
                  {...(link.dataTour ? { 'data-tour': link.dataTour } : {})}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-0.5 ${
                    isActive
                      ? 'bg-brand-50 text-ink-700 shadow-sm'
                      : 'text-ink-400 hover:bg-surface-100 hover:text-ink-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-brand-400 text-white' : 'bg-surface-100 text-ink-300 group-hover:bg-surface-200'
                  }`}>
                    <link.icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1">{link.label}</span>
                  {link.helpText && role !== 'admin' && (
                    <HelpTooltip text={link.helpText} position="right" />
                  )}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-brand-400" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-surface-100">
        {/* Onboarding prompt for clients */}
        {role !== 'admin' && (
          <>
            <Link
              href="/dashboard/onboarding"
              onClick={closeSidebar}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors mb-2"
            >
              <Rocket className="w-4 h-4" />
              <span className="font-medium">Guide de démarrage</span>
            </Link>
            <button
              onClick={() => {
                closeSidebar()
                try { localStorage.removeItem('tour_dashboard-welcome') } catch { /* ignore */ }
                window.dispatchEvent(new CustomEvent('tour:restart', { detail: { tourId: 'dashboard-welcome' } }))
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-ink-300 hover:text-ink-500 hover:bg-surface-50 transition-colors mb-3 w-full"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Revoir le guide interactif</span>
            </button>
          </>
        )}

        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-400 flex items-center justify-center text-sm font-bold text-ink-700">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-600 truncate">{userName}</p>
            <p className="text-xs text-ink-200 capitalize">{role === 'admin' ? 'Administrateur' : 'Client'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-300 hover:bg-red-50 hover:text-red-500 transition-all duration-200 w-full mt-1"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile header bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-surface-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 bg-white rounded-xl shadow-soft text-ink-500 hover:text-ink-700 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Logo size="sm" />
      </div>

      {/* Mobile spacer — pushes content below the fixed header */}
      <div className="lg:hidden h-16 flex-shrink-0" />

      {/* Overlay (mobile only) */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide from left */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-surface-200 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:sticky lg:top-0 lg:translate-x-0 lg:min-h-screen
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
