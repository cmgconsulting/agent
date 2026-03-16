import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Get knowledge context for a client query.
 * Returns company_memory + relevant knowledge chunks.
 * Used by the agent framework to enrich agent prompts.
 */
export async function getKnowledgeContext(
  clientId: string,
  query: string,
  maxChunks: number = 5
): Promise<{
  company_memory: Record<string, unknown> | null
  knowledge_chunks: Array<{
    content: string
    document_title: string
    document_category: string
    chunk_index: number
  }>
}> {
  const adminClient = createServiceRoleClient()

  // 1. Get company memory
  const { data: memory } = await adminClient
    .from('company_memory')
    .select('*')
    .eq('client_id', clientId)
    .single()

  // 2. Search knowledge chunks via full-text search
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .map(w => w.replace(/[^\w\u00C0-\u024F]/g, '')) // keep accented chars
    .filter(Boolean)
    .join(' & ')

  let knowledgeChunks: Array<{
    content: string
    document_title: string
    document_category: string
    chunk_index: number
  }> = []

  if (tsQuery) {
    const { data: chunks } = await adminClient
      .from('knowledge_chunks')
      .select(`
        content,
        chunk_index,
        knowledge_documents!inner (
          title,
          category,
          status
        )
      `)
      .eq('client_id', clientId)
      .textSearch('tsv', tsQuery, { type: 'plain', config: 'french' })
      .limit(maxChunks)

    if (chunks && chunks.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      knowledgeChunks = chunks.map((c: any) => ({
        content: c.content,
        document_title: c.knowledge_documents?.title || 'Document inconnu',
        document_category: c.knowledge_documents?.category || 'autre',
        chunk_index: c.chunk_index,
      }))
    } else {
      // Fallback to ILIKE if tsquery found nothing
      const { data: fallback } = await adminClient
        .from('knowledge_chunks')
        .select(`
          content,
          chunk_index,
          knowledge_documents!inner (
            title,
            category,
            status
          )
        `)
        .eq('client_id', clientId)
        .ilike('content', `%${query.trim().slice(0, 100)}%`)
        .limit(maxChunks)

      if (fallback) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        knowledgeChunks = fallback.map((c: any) => ({
          content: c.content,
          document_title: c.knowledge_documents?.title || 'Document inconnu',
          document_category: c.knowledge_documents?.category || 'autre',
          chunk_index: c.chunk_index,
        }))
      }
    }
  }

  return {
    company_memory: memory || null,
    knowledge_chunks: knowledgeChunks,
  }
}
