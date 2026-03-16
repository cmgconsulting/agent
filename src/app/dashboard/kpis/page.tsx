import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'

export default function ClientKPIsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5 text-brand-500" />}
        title="KPIs"
        subtitle="Vos indicateurs de performance au quotidien"
      />
      <EmptyState
        icon={<BarChart3 className="w-5 h-5 text-brand-400" />}
        title="Bientot disponible"
        description="Cette section sera disponible prochainement avec vos indicateurs de performance personnalises."
        illustration="chart"
      />
    </div>
  )
}
