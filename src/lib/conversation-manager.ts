// ============================================
// CONVERSATION MANAGER
// Server-side utilities for managing conversations and messages.
// All DB writes use the service role client (bypasses RLS).
// ============================================

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  ClientPreference,
  Message,
  MessageRole,
} from '@/types/database'

// ============================================
// saveMessage
// Inserts a new message into the given conversation.
// Returns the new message's id.
// ============================================

export async function saveMessage(params: {
  conversationId: string
  role: MessageRole
  content: string
  tokensUsed?: number
  metadata?: Record<string, unknown>
}): Promise<string> {
  const { conversationId, role, content, tokensUsed = 0, metadata = {} } = params

  const adminClient = createServiceRoleClient()

  const { data, error } = await adminClient
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tokens_used: tokensUsed,
      metadata,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[conversation-manager] saveMessage error:', error)
    throw new Error('Impossible de sauvegarder le message')
  }

  // Touch the conversation's updated_at so ordering by updated_at reflects activity
  await adminClient
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data.id
}

// ============================================
// getOrCreateConversation
// Looks for an existing active conversation for this user+agent pair.
// If none found, creates one.
// Returns the conversation id.
// ============================================

export async function getOrCreateConversation(params: {
  clientId: string
  userId: string
  agentId: string
  title?: string
}): Promise<string> {
  const { clientId, userId, agentId, title = null } = params

  const adminClient = createServiceRoleClient()

  // Try to find an existing active conversation for this user+agent
  const { data: existing } = await adminClient
    .from('conversations')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    return existing.id
  }

  // None found — create a new conversation
  const { data: created, error } = await adminClient
    .from('conversations')
    .insert({
      client_id: clientId,
      user_id: userId,
      agent_id: agentId,
      title,
      status: 'active',
      metadata: {},
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[conversation-manager] getOrCreateConversation error:', error)
    throw new Error('Impossible de creer la conversation')
  }

  return created.id
}

// ============================================
// autoGenerateTitle
// Sets the conversation title to the first 60 characters of the first message.
// Safe to call even if the conversation already has a title (overwrites).
// ============================================

export async function autoGenerateTitle(
  conversationId: string,
  firstMessage: string
): Promise<void> {
  const title = firstMessage.trim().slice(0, 60) || 'Nouvelle conversation'

  const adminClient = createServiceRoleClient()

  const { error } = await adminClient
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)

  if (error) {
    // Non-fatal: log and continue
    console.error('[conversation-manager] autoGenerateTitle error:', error)
  }
}

// ============================================
// getClientPreferences
// Fetches the client_preferences row for a given client+agent pair.
// Returns null if no preferences have been saved yet.
// ============================================

export async function getClientPreferences(
  clientId: string,
  agentId: string
): Promise<ClientPreference | null> {
  const adminClient = createServiceRoleClient()

  const { data, error } = await adminClient
    .from('client_preferences')
    .select('*')
    .eq('client_id', clientId)
    .eq('agent_id', agentId)
    .single()

  if (error || !data) {
    return null
  }

  return data as ClientPreference
}

// ============================================
// getRecentNegativeFeedback
// Returns the last N messages with negative feedback for a given client+agent.
// Useful for injecting context about what the client disliked into agent prompts.
// ============================================

export async function getRecentNegativeFeedback(
  clientId: string,
  agentId: string,
  limit = 10
): Promise<Message[]> {
  const adminClient = createServiceRoleClient()

  // We need to join through conversations to filter by agent_id and client_id
  const { data, error } = await adminClient
    .from('messages')
    .select(`
      id,
      conversation_id,
      role,
      content,
      tokens_used,
      feedback,
      feedback_comment,
      metadata,
      created_at,
      conversations!inner(client_id, agent_id)
    `)
    .eq('feedback', 'negative')
    .eq('conversations.client_id', clientId)
    .eq('conversations.agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[conversation-manager] getRecentNegativeFeedback error:', error)
    return []
  }

  if (!data) return []

  // Strip the joined conversations column before returning typed Message[]
  return data.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conversations: _ignored, ...message } = row as typeof row & { conversations: unknown }
    return message as Message
  })
}
