import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CRMService } from '@/lib/crm/crm-service'
import type { CRMType } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'
// GET — List all CRM connections for current user
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  const service = new CRMService(user.id)
  const connections = await service.getAllConnections()
  return NextResponse.json({ connections })
}

// POST — Connect a CRM
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  try {
    const body = await request.json()
    const { crm_type, credentials } = body as { crm_type: CRMType; credentials: Record<string, string> }

    if (!crm_type || !credentials) {
      return NextResponse.json({ error: 'crm_type et credentials requis' }, { status: 400 })
    }

    const service = new CRMService(user.id)
    const result = await service.connect(crm_type, credentials)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}

// DELETE — Disconnect a CRM
export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const crmType = searchParams.get('crm_type') as CRMType
    if (!crmType) return NextResponse.json({ error: 'crm_type requis' }, { status: 400 })

    const service = new CRMService(user.id)
    await service.disconnect(crmType)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}

// PATCH — Update sync config
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  try {
    const body = await request.json()
    const { crm_type, config } = body as { crm_type: CRMType; config: Record<string, unknown> }

    if (!crm_type || !config) {
      return NextResponse.json({ error: 'crm_type et config requis' }, { status: 400 })
    }

    const service = new CRMService(user.id)
    await service.updateConfig(crm_type, config)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
