import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  RATE_LIMITS,
  sanitizeString,
  isValidUUID,
} from '@/lib/security'
import type { TaskStatus, TaskPriority } from '@/types/database'

const VALID_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

// ============================================
// GET — List task_assignments for the client
// Query params: status?, assigned_to?, limit? (default 50)
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
    const statusParam     = searchParams.get('status')
    const assignedToParam = searchParams.get('assigned_to')
    const limitParam      = searchParams.get('limit')

    const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 200)

    // Validate optional filters
    if (statusParam && !VALID_STATUSES.includes(statusParam as TaskStatus)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs acceptees : ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    if (assignedToParam && !isValidUUID(assignedToParam)) {
      return NextResponse.json({ error: 'Identifiant assigned_to invalide' }, { status: 400 })
    }

    let query = supabase
      .from('task_assignments')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusParam) {
      query = query.eq('status', statusParam as TaskStatus)
    }

    if (assignedToParam) {
      query = query.eq('assigned_to', assignedToParam)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('[tasks GET] Supabase error:', error)
      return NextResponse.json({ error: 'Erreur lors de la recuperation des taches' }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks || [] })
  } catch (err) {
    console.error('[tasks GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// POST — Create a task + assignment notification
// Body: { title, description?, assigned_to, priority?, due_date?, conversation_id?, agent_source? }
// ============================================

export async function POST(request: Request) {
  try {
    const rl = checkRateLimit('tasks-post', RATE_LIMITS.api)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Trop de requetes. Reessayez plus tard.' }, { status: 429 })
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

    const body = await request.json()

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: "Le champ 'title' est requis" }, { status: 400 })
    }

    if (!body.assigned_to) {
      return NextResponse.json({ error: "Le champ 'assigned_to' est requis" }, { status: 400 })
    }

    if (!isValidUUID(body.assigned_to)) {
      return NextResponse.json({ error: "Identifiant 'assigned_to' invalide" }, { status: 400 })
    }

    // Validate optional enum fields
    if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority as TaskPriority)) {
      return NextResponse.json(
        { error: `Priorite invalide. Valeurs acceptees : ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (body.conversation_id !== undefined && !isValidUUID(body.conversation_id)) {
      return NextResponse.json({ error: 'Identifiant de conversation invalide' }, { status: 400 })
    }

    const title       = sanitizeString(body.title, 255)
    const description = body.description ? sanitizeString(body.description, 2000) || null : null
    const agentSource = body.agent_source ? sanitizeString(body.agent_source, 100) || null : null
    const priority    = (body.priority as TaskPriority) || 'medium'
    const dueDate     = body.due_date || null

    if (!title) {
      return NextResponse.json({ error: "Le champ 'title' ne peut pas etre vide" }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Insert the task
    const { data: task, error: insertError } = await adminClient
      .from('task_assignments')
      .insert({
        client_id:       client.id,
        title,
        description,
        assigned_to:     body.assigned_to,
        assigned_by:     user.id,
        status:          'todo',
        priority,
        due_date:        dueDate,
        conversation_id: body.conversation_id || null,
        agent_source:    agentSource,
      })
      .select()
      .single()

    if (insertError || !task) {
      console.error('[tasks POST] Insert error:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la creation de la tache' }, { status: 500 })
    }

    // Create a team_notification of type 'assignment' for the assigned user
    const notifTitle = `Nouvelle tache : ${title}`
    const notifBody  = description
      ? `${description.slice(0, 120)}${description.length > 120 ? '...' : ''}`
      : null

    const { error: notifError } = await adminClient
      .from('team_notifications')
      .insert({
        client_id:      client.id,
        user_id:        body.assigned_to,
        type:           'assignment',
        title:          notifTitle,
        body:           notifBody,
        reference_type: 'task_assignment',
        reference_id:   task.id,
        read:           false,
      })

    if (notifError) {
      // Non-fatal: log but do not fail the request
      console.error('[tasks POST] Notification insert error:', notifError)
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    console.error('[tasks POST] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
