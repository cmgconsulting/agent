import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/agent-framework'

/**
 * POST /api/agent/process-emails
 * Triggered by cron / Make.com to process incoming emails for all clients with Gmail connected
 * Can also be triggered manually from admin
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret or admin auth
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const supabase = createServiceRoleClient()
      // Check if admin user
      const token = authHeader?.replace('Bearer ', '')
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
      } else {
        return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
      }
    }

    const supabase = createServiceRoleClient()

    // Find all active Marc agents with Gmail connected
    const { data: agents } = await supabase
      .from('agents')
      .select('*, connectors!inner(type, status)')
      .eq('type', 'marc')
      .eq('active', true)

    // Workaround: query directly
    const { data: marcAgents } = await supabase
      .from('agents')
      .select('*')
      .eq('type', 'marc')
      .eq('active', true)

    const results: { clientId: string; success: boolean; error?: string }[] = []

    for (const agent of marcAgents || []) {
      // Check if Gmail is connected for this client
      const { data: gmailConn } = await supabase
        .from('connectors')
        .select('id')
        .eq('client_id', agent.client_id)
        .eq('type', 'gmail')
        .eq('status', 'active')
        .single()

      if (!gmailConn) continue

      try {
        await runAgent({
          clientId: agent.client_id,
          agentType: 'marc',
          trigger: 'scheduled',
          userMessage: 'Analyse les emails non lus de la boite mail. Categorise-les (lead, sav, devis, facture, newsletter, spam, autre). Pour les leads et demandes de devis, prepare un brouillon de reponse et cree une action en attente de validation.',
        })
        results.push({ clientId: agent.client_id, success: true })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        results.push({ clientId: agent.client_id, success: false, error: msg })
      }
    }

    // Suppress unused variable warning
    void agents

    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('Process emails error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
