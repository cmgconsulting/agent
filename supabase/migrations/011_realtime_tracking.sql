-- Migration 011: Real-time Agent Tracking
-- Tables: agent_sessions, agent_activity_stream

-- ============================================================
-- Table: agent_sessions
-- Tracks agent execution sessions (one per runAgent call)
-- ============================================================
CREATE TABLE public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'thinking', 'executing', 'completed', 'error')),
  trigger TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger IN ('manual', 'scheduled', 'webhook', 'event')),
  input_preview TEXT,
  output_preview TEXT,
  tokens_used INTEGER DEFAULT 0,
  tools_called INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_sessions_client ON public.agent_sessions(client_id, started_at DESC);
CREATE INDEX idx_agent_sessions_agent ON public.agent_sessions(agent_id, status);
CREATE INDEX idx_agent_sessions_active ON public.agent_sessions(client_id, status)
  WHERE status IN ('thinking', 'executing');

-- ============================================================
-- Table: agent_activity_stream
-- Granular events within a session (tool calls, status changes)
-- ============================================================
CREATE TABLE public.agent_activity_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('status_change', 'tool_call', 'tool_result', 'message', 'error', 'warning')),
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_stream_session ON public.agent_activity_stream(session_id, created_at ASC);
CREATE INDEX idx_activity_stream_client ON public.agent_activity_stream(client_id, created_at DESC);

-- ============================================================
-- Trigger: updated_at on agent_sessions
-- ============================================================
CREATE TRIGGER set_updated_at_agent_sessions
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_stream ENABLE ROW LEVEL SECURITY;

-- agent_sessions
CREATE POLICY "admin_sessions_all" ON public.agent_sessions FOR ALL USING (public.is_admin());
CREATE POLICY "client_sessions_select" ON public.agent_sessions
  FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "service_sessions_insert" ON public.agent_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "service_sessions_update" ON public.agent_sessions
  FOR UPDATE USING (true);

-- agent_activity_stream
CREATE POLICY "admin_activity_all" ON public.agent_activity_stream FOR ALL USING (public.is_admin());
CREATE POLICY "client_activity_select" ON public.agent_activity_stream
  FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "service_activity_insert" ON public.agent_activity_stream
  FOR INSERT WITH CHECK (true);
