import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // This route is called server-side only (service_role)
    const authHeader = request.headers.get('authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      // Also allow calls from within the same server
      const supabase = createServiceRoleClient()
      const body = await request.json()

      const {
        client_id,
        agent_type,
        model,
        input_tokens,
        output_tokens,
        estimated_cost = 0,
        conversation_id = null,
        task_id = null,
        metadata = {},
      } = body

      if (!client_id || !agent_type || !model) {
        return NextResponse.json({ error: 'client_id, agent_type et model sont requis' }, { status: 400 })
      }

      const { data, error } = await supabase.rpc('log_token_usage', {
        p_client_id: client_id,
        p_agent_type: agent_type,
        p_model: model,
        p_input_tokens: input_tokens || 0,
        p_output_tokens: output_tokens || 0,
        p_estimated_cost: estimated_cost,
        p_conversation_id: conversation_id,
        p_task_id: task_id,
        p_metadata: metadata,
      })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  } catch (error) {
    console.error('Log usage error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
