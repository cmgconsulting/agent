import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CRMService } from '@/lib/crm/crm-service'
import type { CRMType } from '@/lib/crm/types'

// POST — Trigger a manual sync
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  try {
    const body = await request.json()
    const { crm_type } = body as { crm_type: CRMType }
    if (!crm_type) return NextResponse.json({ error: 'crm_type requis' }, { status: 400 })

    const service = new CRMService(user.id)
    const adapterResult = await service.getAdapter(crm_type)

    if (!adapterResult) {
      return NextResponse.json({ success: false, error: 'CRM non connecte' }, { status: 400 })
    }

    const { adapter, connectionId } = adapterResult

    // Log sync start
    const logId = await service.logSync(connectionId, 'full', 'bidirectional', 'started')

    let totalSynced = 0
    let totalFailed = 0
    const errors: string[] = []

    // Sync contacts
    try {
      const contacts = await adapter.getContacts({ limit: 100 })
      totalSynced += contacts.length
    } catch (err) {
      totalFailed++
      errors.push(`Contacts: ${(err as Error).message}`)
    }

    // Sync devis
    try {
      const devis = await adapter.getDevis({ limit: 100 })
      totalSynced += devis.length
    } catch (err) {
      totalFailed++
      errors.push(`Devis: ${(err as Error).message}`)
    }

    // Sync factures
    try {
      const factures = await adapter.getFactures({ limit: 100 })
      totalSynced += factures.length
    } catch (err) {
      totalFailed++
      errors.push(`Factures: ${(err as Error).message}`)
    }

    // Update sync log
    const finalStatus = errors.length > 0 ? (totalSynced > 0 ? 'partial' : 'error') : 'success'
    await service.logSync(connectionId, 'full', 'bidirectional', finalStatus, {
      itemsSynced: totalSynced,
      itemsFailed: totalFailed,
      errors,
    })

    // Update connection last_sync
    const supabaseAdmin = createServerSupabaseClient()
    await supabaseAdmin
      .from('crm_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: finalStatus,
        last_sync_details: { items_synced: totalSynced, items_failed: totalFailed, errors },
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return NextResponse.json({
      success: true,
      log_id: logId,
      items_synced: totalSynced,
      items_failed: totalFailed,
      status: finalStatus,
      errors,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}

// GET — Get sync logs
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get('connection_id')
  if (!connectionId) return NextResponse.json({ error: 'connection_id requis' }, { status: 400 })

  const service = new CRMService(user.id)
  const logs = await service.getSyncLogs(connectionId)
  return NextResponse.json({ logs })
}
