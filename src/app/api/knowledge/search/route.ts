import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'

// ============================================
// POST — Search knowledge chunks (full-text)
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('knowledge-search', RATE_LIMITS.api)
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
    const { query, category, limit = 10 } = body

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'Requete de recherche invalide (min 2 caracteres)' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Build PostgreSQL full-text search query
    // Convert user query to tsquery format: split words and join with &
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 1)
      .map((w: string) => w.replace(/[^\w]/g, ''))
      .filter(Boolean)
      .join(' & ')

    if (!tsQuery) {
      return NextResponse.json({ results: [] })
    }

    // Search chunks with full-text search
    let searchQuery = adminClient
      .from('knowledge_chunks')
      .select(`
        id,
        content,
        chunk_index,
        metadata,
        document_id,
        knowledge_documents!inner (
          id,
          title,
          category,
          file_type
        )
      `)
      .eq('client_id', client.id)
      .textSearch('tsv', tsQuery, { type: 'plain', config: 'french' })
      .limit(Math.min(limit, 50))

    if (category) {
      searchQuery = searchQuery.eq('knowledge_documents.category', category)
    }

    const { data: results, error } = await searchQuery

    if (error) {
      console.error('Search error:', error)
      // Fallback to ILIKE if tsquery fails
      const { data: fallbackResults } = await adminClient
        .from('knowledge_chunks')
        .select(`
          id,
          content,
          chunk_index,
          metadata,
          document_id,
          knowledge_documents!inner (
            id,
            title,
            category,
            file_type
          )
        `)
        .eq('client_id', client.id)
        .ilike('content', `%${query.trim()}%`)
        .limit(Math.min(limit, 50))

      return NextResponse.json({ results: fallbackResults || [] })
    }

    return NextResponse.json({ results: results || [] })
  } catch (err) {
    console.error('Error searching knowledge:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
