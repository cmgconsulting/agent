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
// GET — Task detail with assignee profile info
// ============================================

export async function GET(
  _request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params

    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Identifiant de tache invalide' }, { status: 400 })
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

    // Fetch task with assignee profile (ownership enforced via client_id)
    const { data: task, error } = await supabase
      .from('task_assignments')
      .select(`
        id,
        client_id,
        conversation_id,
        title,
        description,
        assigned_to,
        assigned_by,
        status,
        priority,
        due_date,
        agent_source,
        created_at,
        updated_at,
        assignee:profiles!assigned_to(id, email, full_name, avatar_url)
      `)
      .eq('id', taskId)
      .eq('client_id', client.id)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Tache introuvable' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (err) {
    console.error('[tasks/[taskId] GET] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// PATCH — Update task fields
// Body: { title?, description?, status?, priority?, assigned_to?, due_date? }
// ============================================

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params

    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Identifiant de tache invalide' }, { status: 400 })
    }

    const rl = checkRateLimit('tasks-patch', RATE_LIMITS.api)
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

    // Verify ownership
    const { data: existing } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('id', taskId)
      .eq('client_id', client.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Tache introuvable' }, { status: 404 })
    }

    const body = await request.json()
    const updatePayload: Record<string, unknown> = {}

    if (body.title !== undefined) {
      const title = sanitizeString(body.title, 255)
      if (!title) {
        return NextResponse.json({ error: "Le champ 'title' ne peut pas etre vide" }, { status: 400 })
      }
      updatePayload.title = title
    }

    if (body.description !== undefined) {
      updatePayload.description = body.description
        ? sanitizeString(body.description, 2000) || null
        : null
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as TaskStatus)) {
        return NextResponse.json(
          { error: `Statut invalide. Valeurs acceptees : ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updatePayload.status = body.status
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority as TaskPriority)) {
        return NextResponse.json(
          { error: `Priorite invalide. Valeurs acceptees : ${VALID_PRIORITIES.join(', ')}` },
          { status: 400 }
        )
      }
      updatePayload.priority = body.priority
    }

    if (body.assigned_to !== undefined) {
      if (!isValidUUID(body.assigned_to)) {
        return NextResponse.json({ error: "Identifiant 'assigned_to' invalide" }, { status: 400 })
      }
      updatePayload.assigned_to = body.assigned_to
    }

    if (body.due_date !== undefined) {
      updatePayload.due_date = body.due_date || null
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Aucun champ a mettre a jour' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    const { data: task, error: updateError } = await adminClient
      .from('task_assignments')
      .update(updatePayload)
      .eq('id', taskId)
      .select()
      .single()

    if (updateError || !task) {
      console.error('[tasks/[taskId] PATCH] Update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour de la tache' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (err) {
    console.error('[tasks/[taskId] PATCH] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================
// DELETE — Delete task (verify client ownership)
// ============================================

export async function DELETE(
  _request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params

    if (!isValidUUID(taskId)) {
      return NextResponse.json({ error: 'Identifiant de tache invalide' }, { status: 400 })
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

    // Verify ownership before deleting
    const { data: existing } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('id', taskId)
      .eq('client_id', client.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Tache introuvable' }, { status: 404 })
    }

    const adminClient = createServiceRoleClient()

    const { error: deleteError } = await adminClient
      .from('task_assignments')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      console.error('[tasks/[taskId] DELETE] Error:', deleteError)
      return NextResponse.json({ error: 'Erreur lors de la suppression de la tache' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tasks/[taskId] DELETE] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
