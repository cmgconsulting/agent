-- Migration 008: Conversation History & Client Preferences
-- Tables: conversations, messages, client_preferences

-- ============================================================
-- Table: conversations
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_client ON public.conversations(client_id, updated_at DESC);
CREATE INDEX idx_conversations_user_agent ON public.conversations(user_id, agent_id, updated_at DESC);

-- ============================================================
-- Table: messages
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  feedback TEXT CHECK (feedback IN ('positive', 'negative')),
  feedback_comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ============================================================
-- Table: client_preferences
-- ============================================================
CREATE TABLE public.client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  preferred_tone TEXT NOT NULL DEFAULT 'professionnel' CHECK (preferred_tone IN ('formel', 'decontracte', 'technique')),
  preferred_length TEXT NOT NULL DEFAULT 'detaille' CHECK (preferred_length IN ('concis', 'detaille', 'exhaustif')),
  custom_instructions TEXT,
  good_examples TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_preferences_unique UNIQUE (client_id, agent_id)
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;

-- conversations
CREATE POLICY "admin_conversations_all" ON public.conversations FOR ALL USING (public.is_admin());
CREATE POLICY "client_conversations_select" ON public.conversations FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "client_conversations_insert" ON public.conversations FOR INSERT WITH CHECK (client_id = public.get_my_client_id());
CREATE POLICY "client_conversations_update" ON public.conversations FOR UPDATE USING (client_id = public.get_my_client_id());
CREATE POLICY "service_conversations_insert" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "service_conversations_update" ON public.conversations FOR UPDATE USING (true);

-- messages
CREATE POLICY "admin_messages_all" ON public.messages FOR ALL USING (public.is_admin());
CREATE POLICY "client_messages_select" ON public.messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.client_id = public.get_my_client_id()));
CREATE POLICY "client_messages_insert" ON public.messages
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.client_id = public.get_my_client_id()));
CREATE POLICY "client_messages_update" ON public.messages
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.client_id = public.get_my_client_id()));
CREATE POLICY "service_messages_insert" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "service_messages_update" ON public.messages FOR UPDATE USING (true);

-- client_preferences
CREATE POLICY "admin_preferences_all" ON public.client_preferences FOR ALL USING (public.is_admin());
CREATE POLICY "client_preferences_select" ON public.client_preferences FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "client_preferences_insert" ON public.client_preferences FOR INSERT WITH CHECK (client_id = public.get_my_client_id());
CREATE POLICY "client_preferences_update" ON public.client_preferences FOR UPDATE USING (client_id = public.get_my_client_id());
