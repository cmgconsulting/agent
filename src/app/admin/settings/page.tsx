import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'

export default function AdminSettingsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={Settings}
        title="Paramètres"
        subtitle="Configuration de la plateforme"
      />
      <EmptyState
        icon={Settings}
        title="Bientot disponible"
        description="La configuration avancée de la plateforme sera disponible prochainement."
        illustration="rocket"
      />
    </div>
  )
}
