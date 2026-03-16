import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'
import { getKnowledgeContext } from '@/lib/knowledge/context'

/**
 * POST /api/knowledge/context
 *
 * Retrieves relevant knowledge context for an agent query.
 * Combines company_memory + knowledge_chunks results.
 */
export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('knowledge-context', RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    const body = await request.json()
    const { query, max_chunks = 5 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query requise' }, { status: 400 })
    }

    const context = await getKnowledgeContext(client.id, query, max_chunks)
    return NextResponse.json(context)
  } catch (err) {
    console.error('Error getting knowledge context:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
