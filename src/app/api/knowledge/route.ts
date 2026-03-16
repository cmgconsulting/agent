import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString, validateRequired } from '@/lib/security'
import { extractText, extractFromUrl } from '@/lib/knowledge/extract'
import { chunkText } from '@/lib/knowledge/chunker'
import type { KnowledgeCategory, KnowledgeFileType } from '@/types/database'

const VALID_CATEGORIES: KnowledgeCategory[] = ['produits', 'services', 'technique', 'commercial', 'juridique', 'rh', 'autre']
const VALID_FILE_TYPES: KnowledgeFileType[] = ['pdf', 'docx', 'txt', 'csv', 'md', 'xlsx', 'url']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// ============================================
// GET — List knowledge documents for client
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
    const category = searchParams.get('category')

    let query = supabase
      .from('knowledge_documents')
      .select('id, title, description, category, file_type, file_size, status, processing_error, chunks_count, metadata, created_at, updated_at')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    if (category && VALID_CATEGORIES.includes(category as KnowledgeCategory)) {
      query = query.eq('category', category)
    }

    const { data: documents } = await query

    return NextResponse.json({ documents: documents || [] })
  } catch (err) {
    console.error('Error listing knowledge documents:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// POST — Upload a knowledge document
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('knowledge-upload', RATE_LIMITS.api)
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

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || null
    const category = (formData.get('category') as string) || 'autre'
    const fileType = formData.get('file_type') as string
    const tagsRaw = formData.get('tags') as string
    const sourceUrl = formData.get('source_url') as string
    const file = formData.get('file') as File | null

    // Validate required fields
    const missing = validateRequired({ title, file_type: fileType }, ['title', 'file_type'])
    if (missing) return NextResponse.json({ error: missing }, { status: 400 })

    if (!VALID_FILE_TYPES.includes(fileType as KnowledgeFileType)) {
      return NextResponse.json({ error: `Type de fichier invalide. Types acceptes: ${VALID_FILE_TYPES.join(', ')}` }, { status: 400 })
    }

    if (!VALID_CATEGORIES.includes(category as KnowledgeCategory)) {
      return NextResponse.json({ error: 'Categorie invalide' }, { status: 400 })
    }

    // For URL type, source_url is required; for file types, file is required
    if (fileType === 'url' && !sourceUrl) {
      return NextResponse.json({ error: 'URL source requise pour le type URL' }, { status: 400 })
    }
    if (fileType !== 'url' && !file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    if (file && file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 50 Mo)' }, { status: 400 })
    }

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
    const adminClient = createServiceRoleClient()

    // Create document record with pending status
    const { data: doc, error: insertError } = await adminClient
      .from('knowledge_documents')
      .insert({
        client_id: client.id,
        title: sanitizeString(title, 200),
        description: description ? sanitizeString(description, 1000) : null,
        category,
        file_type: fileType,
        file_size: file?.size || null,
        source_url: fileType === 'url' ? sourceUrl : null,
        status: 'pending',
        metadata: { tags },
      })
      .select()
      .single()

    if (insertError || !doc) {
      console.error('Error creating knowledge document:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la creation du document' }, { status: 500 })
    }

    // Process asynchronously (but within the request for simplicity)
    // In production, this should be a background job
    processDocument(adminClient, doc.id, client.id, fileType as KnowledgeFileType, file, sourceUrl)
      .catch(err => console.error(`Error processing document ${doc.id}:`, err))

    return NextResponse.json({
      success: true,
      document: doc,
    }, { status: 201 })
  } catch (err) {
    console.error('Error uploading knowledge document:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// Background processing
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processDocument(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  documentId: string,
  clientId: string,
  fileType: KnowledgeFileType,
  file: File | null,
  sourceUrl: string | null
) {
  try {
    // Update status to processing
    await adminClient
      .from('knowledge_documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    let rawText: string
    let storagePath: string | null = null

    if (fileType === 'url' && sourceUrl) {
      rawText = await extractFromUrl(sourceUrl)
    } else if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())

      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      storagePath = `${clientId}/${fileName}`

      const { error: uploadError } = await adminClient.storage
        .from('knowledge-files')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Erreur d'upload: ${uploadError.message}`)
      }

      rawText = await extractText(buffer, fileType)
    } else {
      throw new Error('Ni fichier ni URL fourni')
    }

    // Chunk the text
    const chunks = chunkText(rawText)

    // Insert chunks
    if (chunks.length > 0) {
      const chunkRows = chunks.map(c => ({
        document_id: documentId,
        client_id: clientId,
        content: c.content,
        chunk_index: c.chunk_index,
        metadata: c.metadata,
      }))

      const { error: chunksError } = await adminClient
        .from('knowledge_chunks')
        .insert(chunkRows)

      if (chunksError) {
        throw new Error(`Erreur d'insertion des chunks: ${chunksError.message}`)
      }
    }

    // Update document as ready
    await adminClient
      .from('knowledge_documents')
      .update({
        status: 'ready',
        storage_path: storagePath,
        raw_text: rawText.slice(0, 100_000), // Limit stored raw text
        chunks_count: chunks.length,
      })
      .eq('id', documentId)

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    await adminClient
      .from('knowledge_documents')
      .update({
        status: 'error',
        processing_error: msg,
      })
      .eq('id', documentId)
  }
}
