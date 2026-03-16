'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Settings, CreditCard, Key, Shield } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

const tabs = [
  { href: '/admin/settings', label: 'Général', icon: Settings, exact: true },
  { href: '/admin/settings/plans', label: 'Plans & Tarifs', icon: CreditCard },
  { href: '/admin/settings/api-keys', label: 'Clés API', icon: Key },
  { href: '/admin/settings/security', label: 'Sécurité', icon: Shield },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<Settings className="w-5 h-5 text-brand-500" />}
        title="Paramètres"
        subtitle="Configuration de la plateforme"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-surface-200 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          const TabIcon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-brand-400 text-ink-700'
                  : 'border-transparent text-ink-300 hover:text-ink-500 hover:border-surface-300'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
