import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// ============================================
// GET — List executions for client, with workflow name joined
// Query params: workflow_id (optional), limit (default 20)
// ============================================

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const workflowIdParam = searchParams.get('workflow_id')
    const limitParam = searchParams.get('limit')

    // Validate workflow_id if provided
    if (workflowIdParam && !isValidUUID(workflowIdParam)) {
      return NextResponse.json({ error: 'Identifiant de workflow invalide' }, { status: 400 })
    }

    let limit = parseInt(limitParam ?? String(DEFAULT_LIMIT), 10)
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    let query = supabase
      .from('workflow_executions')
      .select(`
        id,
        workflow_id,
        client_id,
        status,
        trigger_data,
        started_at,
        completed_at,
        error,
        workflows(id, name, description, status, trigger_type)
      `)
      .eq('client_id', client.id)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (workflowIdParam) {
      query = query.eq('workflow_id', workflowIdParam)
    }

    const { data: executions, error } = await query

    if (error) {
      console.error('[workflows/executions GET] Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des executions' }, { status: 500 })
    }

    return NextResponse.json({ executions: executions || [] })
  } catch (err) {
    console.error('[workflows/executions GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
