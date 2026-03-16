import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { ConnectorManager } from './connector-manager'

export default async function ClientConnectorsPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  const { data: connectors } = await supabase
    .from('connectors')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <Link href={`/admin/clients/${params.id}`} className="flex items-center gap-2 text-ink-400 hover:text-ink-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour au client
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-700">Connecteurs</h1>
          <p className="text-ink-400">{client.company_name}</p>
        </div>
      </div>

      <ConnectorManager
        clientId={params.id}
        initialConnectors={connectors || []}
      />
    </div>
  )
}
