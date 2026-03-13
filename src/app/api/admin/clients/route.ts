import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AgentType, PlanType } from '@/types/database'

export async function POST(request: Request) {
  try {
    // Verify the caller is admin
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, fullName, companyName, plan, phone, address, siret, activeAgents } = body

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Use service role to create the user (bypasses RLS)
    const adminClient = createServiceRoleClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'client',
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Update the profile with full_name (trigger already created it)
    await adminClient
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', authData.user.id)

    // 3. Create client record
    const { data: client, error: clientError } = await adminClient
      .from('clients')
      .insert({
        user_id: authData.user.id,
        company_name: companyName,
        plan: plan as PlanType,
        active_agents: activeAgents as AgentType[],
        phone: phone || null,
        address: address || null,
        siret: siret || null,
        is_active: true,
      })
      .select()
      .single()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 400 })
    }

    // 4. Log the admin action
    await adminClient.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'create_client',
      target_type: 'client',
      target_id: client.id,
      details: { company_name: companyName, plan, agents_count: activeAgents.length },
    })

    return NextResponse.json({ success: true, client })
  } catch (err) {
    console.error('Error creating client:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ clients })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
