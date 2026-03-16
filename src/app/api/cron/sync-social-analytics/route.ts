import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncAnalyticsForClient } from '@/lib/social/analytics/aggregator'

/**
 * GET /api/cron/sync-social-analytics
 * Cron job: sync analytics for all clients with active social accounts.
 * Called hourly via Vercel Cron.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get all clients with active social accounts
    const { data: clients } = await supabase
      .from('social_accounts')
      .select('client_id')
      .eq('status', 'active')

    if (!clients?.length) {
      return NextResponse.json({ message: 'Aucun compte actif', synced: 0, errors: 0 })
    }

    // Deduplicate client IDs
    const clientIds = Array.from(new Set(clients.map(c => c.client_id)))

    let totalSynced = 0
    let totalErrors = 0

    for (const clientId of clientIds) {
      const { synced, errors } = await syncAnalyticsForClient(clientId)
      totalSynced += synced
      totalErrors += errors
    }

    return NextResponse.json({
      message: `Sync terminee: ${totalSynced} comptes synchronises, ${totalErrors} erreurs`,
      synced: totalSynced,
      errors: totalErrors,
      clientsProcessed: clientIds.length,
    })
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({ error: 'Erreur sync analytics' }, { status: 500 })
  }
}
