-- Migration 006: ROI Tracking & Analytics
-- Tables: agent_usage_logs, roi_config

-- ============================================================
-- Table: agent_usage_logs
-- ============================================================
CREATE TABLE public.agent_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  estimated_human_minutes NUMERIC(8,2) NOT NULL DEFAULT 0,
  agent_duration_seconds NUMERIC(8,2) NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX idx_usage_logs_client_created ON public.agent_usage_logs(client_id, created_at DESC);
CREATE INDEX idx_usage_logs_agent ON public.agent_usage_logs(agent_id, created_at DESC);

-- ============================================================
-- Table: roi_config
-- ============================================================
CREATE TABLE public.roi_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hourly_cost_euros NUMERIC(10,2) NOT NULL DEFAULT 45.00,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roi_config_client_unique UNIQUE (client_id)
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.agent_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_config ENABLE ROW LEVEL SECURITY;

-- agent_usage_logs: admin full access
CREATE POLICY "admin_usage_logs_all" ON public.agent_usage_logs
  FOR ALL USING (public.is_admin());

-- agent_usage_logs: client reads own logs
CREATE POLICY "client_usage_logs_select" ON public.agent_usage_logs
  FOR SELECT USING (client_id = public.get_my_client_id());

-- agent_usage_logs: service role inserts (via agent framework)
CREATE POLICY "service_usage_logs_insert" ON public.agent_usage_logs
  FOR INSERT WITH CHECK (true);

-- roi_config: admin full access
CREATE POLICY "admin_roi_config_all" ON public.roi_config
  FOR ALL USING (public.is_admin());

-- roi_config: client CRUD on own config
CREATE POLICY "client_roi_config_select" ON public.roi_config
  FOR SELECT USING (client_id = public.get_my_client_id());

CREATE POLICY "client_roi_config_insert" ON public.roi_config
  FOR INSERT WITH CHECK (client_id = public.get_my_client_id());

CREATE POLICY "client_roi_config_update" ON public.roi_config
  FOR UPDATE USING (client_id = public.get_my_client_id());
