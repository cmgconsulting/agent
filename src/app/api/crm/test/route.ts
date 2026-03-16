import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CRMService } from '@/lib/crm/crm-service'
import type { CRMType } from '@/lib/crm/types'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

  try {
    const body = await request.json()
    const { crm_type } = body as { crm_type: CRMType }
    if (!crm_type) return NextResponse.json({ error: 'crm_type requis' }, { status: 400 })

    const service = new CRMService(user.id)
    const result = await service.testConnection(crm_type)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
