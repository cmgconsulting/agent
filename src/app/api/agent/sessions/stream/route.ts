import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
/**
 * GET /api/agent/sessions/stream?session_id=xxx
 * SSE endpoint for real-time agent session tracking.
 * Streams activity events as they occur via Supabase Realtime polling.
 */
export async function GET(request: Request) {
  // Auth check
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Non authentifie', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()
  if (!profile?.client_id) {
    return new Response('Pas de client associe', { status: 403 })
  }

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) {
    return new Response('session_id requis', { status: 400 })
  }

  // Verify session belongs to client
  const serviceClient = createServiceRoleClient()
  const { data: session } = await serviceClient
    .from('agent_sessions')
    .select('id, client_id, status')
    .eq('id', sessionId)
    .eq('client_id', profile.client_id)
    .single()

  if (!session) {
    return new Response('Session non trouvee', { status: 404 })
  }

  // SSE stream via polling (Supabase Realtime not available server-side in Next.js)
  const encoder = new TextEncoder()
  let lastEventId = ''
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventType: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial session state
      sendEvent('session', session)

      // Poll for new events every 500ms
      const poll = async () => {
        if (closed) return

        try {
          let query = serviceClient
            .from('agent_activity_stream')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })

          if (lastEventId) {
            query = query.gt('id', lastEventId)
          }

          const { data: events } = await query

          if (events?.length) {
            for (const event of events) {
              sendEvent('activity', event)
              lastEventId = event.id
            }
          }

          // Check session status
          const { data: currentSession } = await serviceClient
            .from('agent_sessions')
            .select('status, completed_at, tokens_used, tools_called, duration_ms, output_preview, error_message')
            .eq('id', sessionId)
            .single()

          if (currentSession) {
            sendEvent('session_update', currentSession)

            if (currentSession.status === 'completed' || currentSession.status === 'error') {
              sendEvent('done', { status: currentSession.status })
              closed = true
              controller.close()
              return
            }
          }
        } catch {
          // Continue polling on error
        }

        if (!closed) {
          setTimeout(poll, 500)
        }
      }

      poll()
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
