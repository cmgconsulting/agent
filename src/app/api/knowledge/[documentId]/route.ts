import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// ============================================
// GET — Get document details + chunks
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { documentId: string } }
) {
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

    const { data: document } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', params.documentId)
      .eq('client_id', client.id)
      .single()

    if (!document) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    return NextResponse.json({ document })
  } catch (err) {
    console.error('Error getting knowledge document:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// DELETE — Delete document + chunks + file
// ============================================

export async function DELETE(
  _request: Request,
  { params }: { params: { documentId: string } }
) {
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

    const adminClient = createServiceRoleClient()

    // Get document to find storage path
    const { data: document } = await adminClient
      .from('knowledge_documents')
      .select('id, client_id, storage_path')
      .eq('id', params.documentId)
      .single()

    if (!document) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    // Verify ownership (admin bypass via profile check)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (document.client_id !== client.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    // Delete file from storage if exists
    if (document.storage_path) {
      await adminClient.storage
        .from('knowledge-files')
        .remove([document.storage_path])
    }

    // Delete chunks (cascade should handle this, but be explicit)
    await adminClient
      .from('knowledge_chunks')
      .delete()
      .eq('document_id', document.id)

    // Delete document
    await adminClient
      .from('knowledge_documents')
      .delete()
      .eq('id', document.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error deleting knowledge document:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
