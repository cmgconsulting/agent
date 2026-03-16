-- Migration 010: Team Collaboration
-- Tables: modify profiles, shared_conversations, task_assignments, team_notifications

-- ============================================================
-- Add team role to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_in_team TEXT DEFAULT 'owner'
    CHECK (role_in_team IN ('owner', 'manager', 'member', 'viewer'));

-- ============================================================
-- Table: shared_conversations
-- ============================================================
CREATE TABLE public.shared_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with_team BOOLEAN NOT NULL DEFAULT false,
  shared_with_users UUID[] DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_conversations_conv ON public.shared_conversations(conversation_id);

-- ============================================================
-- Table: task_assignments
-- ============================================================
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  agent_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_assignments_client ON public.task_assignments(client_id, status);
CREATE INDEX idx_task_assignments_user ON public.task_assignments(assigned_to, status);

-- ============================================================
-- Table: team_notifications
-- ============================================================
CREATE TABLE public.team_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('share', 'assignment', 'mention', 'agent_alert')),
  title TEXT NOT NULL,
  body TEXT,
  reference_type TEXT,
  reference_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.team_notifications(user_id, read, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notifications ENABLE ROW LEVEL SECURITY;

-- shared_conversations
CREATE POLICY "admin_shared_all" ON public.shared_conversations FOR ALL USING (public.is_admin());
CREATE POLICY "client_shared_select" ON public.shared_conversations
  FOR SELECT USING (
    shared_by = auth.uid()
    OR shared_with_team = true
    OR auth.uid() = ANY(shared_with_users)
  );
CREATE POLICY "client_shared_insert" ON public.shared_conversations
  FOR INSERT WITH CHECK (shared_by = auth.uid());
CREATE POLICY "client_shared_delete" ON public.shared_conversations
  FOR DELETE USING (shared_by = auth.uid());

-- task_assignments: visible by everyone in the same client
CREATE POLICY "admin_tasks_all" ON public.task_assignments FOR ALL USING (public.is_admin());
CREATE POLICY "client_tasks_select" ON public.task_assignments
  FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "client_tasks_insert" ON public.task_assignments
  FOR INSERT WITH CHECK (client_id = public.get_my_client_id());
CREATE POLICY "client_tasks_update" ON public.task_assignments
  FOR UPDATE USING (client_id = public.get_my_client_id());
CREATE POLICY "client_tasks_delete" ON public.task_assignments
  FOR DELETE USING (client_id = public.get_my_client_id());

-- team_notifications
CREATE POLICY "admin_notifications_all" ON public.team_notifications FOR ALL USING (public.is_admin());
CREATE POLICY "user_notifications_select" ON public.team_notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_notifications_update" ON public.team_notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "service_notifications_insert" ON public.team_notifications
  FOR INSERT WITH CHECK (true);
