import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// ============================================
// GET — Notifications for the authenticated user
// Query params: unread_only? (boolean, default false), limit? (default 20)
// Also returns unread_count (total unread notifications)
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
    const unreadOnlyParam = searchParams.get('unread_only')
    const limitParam      = searchParams.get('limit')

    const unreadOnly = unreadOnlyParam === 'true' || unreadOnlyParam === '1'
    const limit      = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 100)

    // Fetch notifications for this user (scoped to their client for security)
    let query = supabase
      .from('team_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('[notifications GET] Supabase error:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des notifications' }, { status: 500 })
    }

    // Fetch total unread count (always, regardless of unread_only filter)
    const { count: unreadCount, error: countError } = await supabase
      .from('team_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('client_id', client.id)
      .eq('read', false)

    if (countError) {
      console.error('[notifications GET] Count error:', countError)
    }

    return NextResponse.json({
      notifications: notifications || [],
      unread_count:  unreadCount ?? 0,
    })
  } catch (err) {
    console.error('[notifications GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
