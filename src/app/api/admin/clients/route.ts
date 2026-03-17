import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AgentType } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Verify the caller is admin
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, fullName, companyName, plan, phone, address, siret, activeAgents } = body

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'Champs requis manquants (email, mot de passe, nom entreprise)' }, { status: 400 })
    }

    // Use service role to create the user (bypasses RLS)
    const adminClient = createServiceRoleClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        role: 'client',
      },
    })

    if (authError) {
      console.error('Auth createUser error:', authError)
      // Provide a more helpful message
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: `L'email ${email} est déjà utilisé` }, { status: 409 })
      }
      if (authError.message.includes('Database error')) {
        return NextResponse.json({
          error: 'Erreur base de données lors de la création du compte. Vérifiez les logs Supabase.',
          details: authError.message
        }, { status: 500 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Ensure profile exists (trigger should have created it, but we ensure it)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      // Trigger didn't fire or failed — create profile manually
      await adminClient
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name: fullName || '',
          role: 'client',
        }, { onConflict: 'id' })
    } else {
      // Update full_name if trigger set it empty
      await adminClient
        .from('profiles')
        .update({ full_name: fullName || '' })
        .eq('id', userId)
    }

    // 3. Create client record
    // Map plan name to valid enum value
    const validPlans = ['basic', 'starter', 'pro', 'full', 'enterprise']
    const safePlan = validPlans.includes(plan) ? plan : 'starter'

    const { data: client, error: clientError } = await adminClient
      .from('clients')
      .insert({
        user_id: userId,
        company_name: companyName,
        plan: safePlan,
        active_agents: (activeAgents || []) as AgentType[],
        phone: phone || null,
        address: address || null,
        siret: siret || null,
        is_active: true,
      })
      .select()
      .single()

    if (clientError) {
      console.error('Client insert error:', clientError)
      // Don't leave orphan auth user — try to clean up
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({
        error: `Erreur création du client: ${clientError.message}`,
      }, { status: 400 })
    }

    // 4. Log the admin action (don't fail if this errors)
    try {
      await adminClient.from('admin_audit_log').insert({
        admin_id: user.id,
        action: 'create_client',
        target_type: 'client',
        target_id: client.id,
        details: { company_name: companyName, plan: safePlan, agents_count: (activeAgents || []).length },
      })
    } catch {
      // Non-critical, don't fail the request
    }

    // 5. Also log in the new admin_sessions_log
    try {
      await adminClient.from('admin_sessions_log').insert({
        user_id: user.id,
        action: 'client.create',
        details: { company_name: companyName, plan: safePlan, client_id: client.id },
      })
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, client })
  } catch (err) {
    console.error('Error creating client:', err)
    return NextResponse.json({ error: 'Erreur serveur inattendue' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
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
