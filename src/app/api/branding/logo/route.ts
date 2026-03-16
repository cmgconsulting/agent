import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'

export const dynamic = 'force-dynamic'
// ============================================
// CONSTANTS
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const STORAGE_BUCKET = 'branding-assets'

// ============================================
// POST — Upload brand logo
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    // Rate limit (reuse api bucket — logo uploads are infrequent)
    const rl = checkRateLimit(`branding-logo:${user.id}`, RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Parse multipart form
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Corps de requete multipart invalide' }, { status: 400 })
    }

    const logo = formData.get('logo') as File | null
    if (!logo) {
      return NextResponse.json({ error: 'Le champ \'logo\' est requis' }, { status: 400 })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(logo.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporte. Types acceptes: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (logo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (maximum 5 Mo)' }, { status: 400 })
    }

    // Determine extension from MIME type
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
    }
    const ext = extMap[logo.type] ?? 'png'
    const storagePath = `${client.id}/logo.${ext}`

    const buffer = Buffer.from(await logo.arrayBuffer())

    // Use service role client so RLS does not block storage writes
    const adminClient = createServiceRoleClient()

    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: logo.type,
        upsert: true, // overwrite existing logo
      })

    if (uploadError) {
      console.error('[branding/logo] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Erreur lors de l'upload du logo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = adminClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    const logoUrl = publicUrlData.publicUrl

    // Upsert branding config with new logo_url
    const { data: branding, error: upsertError } = await adminClient
      .from('client_branding_config')
      .upsert(
        { client_id: client.id, logo_url: logoUrl },
        { onConflict: 'client_id' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[branding/logo] Branding upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Logo uploade mais erreur lors de la mise a jour de la configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logo_url: logoUrl,
      branding,
    })
  } catch (err) {
    console.error('[branding/logo] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
