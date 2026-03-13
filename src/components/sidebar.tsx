'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'
import {
  LayoutDashboard, Users, Settings, LogOut, Bot, Plug, BarChart3, Rocket, FileText, Activity, BookOpen, ClipboardList
} from 'lucide-react'

interface SidebarProps {
  role: UserRole
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/clients', label: 'Clients', icon: Users },
    { href: '/admin/agents', label: 'Agents', icon: Bot },
    { href: '/admin/onboarding', label: 'Onboarding', icon: Rocket },
    { href: '/admin/analytics', label: 'Analytics', icon: Activity },
    { href: '/admin/logs', label: 'Logs', icon: FileText },
    { href: '/admin/docs', label: 'Documentation', icon: BookOpen },
    { href: '/admin/settings', label: 'Parametres', icon: Settings },
  ]

  const clientLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/onboarding', label: 'Onboarding', icon: ClipboardList },
    { href: '/dashboard/agents', label: 'Mes Agents', icon: Bot },
    { href: '/dashboard/connectors', label: 'Connecteurs', icon: Plug },
    { href: '/dashboard/kpis', label: 'KPIs', icon: BarChart3 },
    { href: '/dashboard/docs', label: 'Guide', icon: BookOpen },
  ]

  const links = role === 'admin' ? adminLinks : clientLinks

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">CMG Agents</h1>
        <p className="text-sm text-gray-400 mt-1">
          {role === 'admin' ? 'Administration' : 'Espace Client'}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Deconnexion
        </button>
      </div>
    </aside>
  )
}
