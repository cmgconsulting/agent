-- Migration 012: Scheduled Tasks
-- Tables: scheduled_tasks, scheduled_task_runs

-- ============================================================
-- Table: scheduled_tasks
-- Defines recurring or one-time scheduled agent/workflow tasks
-- ============================================================
CREATE TABLE public.scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('agent_run', 'workflow_run')),
  -- What to execute
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  prompt TEXT,
  trigger_data JSONB DEFAULT '{}',
  -- Schedule config
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly', 'cron')),
  schedule_config JSONB NOT NULL DEFAULT '{}',
  -- once: { "run_at": "2026-03-15T10:00:00Z" }
  -- daily: { "time": "09:00", "timezone": "Europe/Paris" }
  -- weekly: { "day": 1, "time": "09:00", "timezone": "Europe/Paris" }  (0=Sun..6=Sat)
  -- monthly: { "day_of_month": 1, "time": "09:00", "timezone": "Europe/Paris" }
  -- cron: { "expression": "0 9 * * 1-5", "timezone": "Europe/Paris" }
  cron_expression TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  -- Execution state
  active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  lock_key UUID,
  run_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  max_retries INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraints
  CONSTRAINT scheduled_tasks_agent_or_workflow CHECK (
    (task_type = 'agent_run' AND agent_id IS NOT NULL)
    OR (task_type = 'workflow_run' AND workflow_id IS NOT NULL)
  )
);

CREATE INDEX idx_scheduled_tasks_client ON public.scheduled_tasks(client_id, active);
CREATE INDEX idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run_at, active)
  WHERE active = true AND next_run_at IS NOT NULL;
CREATE INDEX idx_scheduled_tasks_locked ON public.scheduled_tasks(locked_until)
  WHERE locked_until IS NOT NULL;

-- ============================================================
-- Table: scheduled_task_runs
-- Execution history for scheduled tasks
-- ============================================================
CREATE TABLE public.scheduled_task_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.scheduled_tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  output TEXT,
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'cron'
    CHECK (triggered_by IN ('cron', 'manual', 'retry')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_task_runs_task ON public.scheduled_task_runs(task_id, started_at DESC);
CREATE INDEX idx_task_runs_client ON public.scheduled_task_runs(client_id, started_at DESC);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER set_updated_at_scheduled_tasks
  BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_task_runs ENABLE ROW LEVEL SECURITY;

-- scheduled_tasks
CREATE POLICY "admin_sched_all" ON public.scheduled_tasks FOR ALL USING (public.is_admin());
CREATE POLICY "client_sched_select" ON public.scheduled_tasks
  FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "client_sched_insert" ON public.scheduled_tasks
  FOR INSERT WITH CHECK (client_id = public.get_my_client_id());
CREATE POLICY "client_sched_update" ON public.scheduled_tasks
  FOR UPDATE USING (client_id = public.get_my_client_id());
CREATE POLICY "client_sched_delete" ON public.scheduled_tasks
  FOR DELETE USING (client_id = public.get_my_client_id());

-- scheduled_task_runs
CREATE POLICY "admin_runs_all" ON public.scheduled_task_runs FOR ALL USING (public.is_admin());
CREATE POLICY "client_runs_select" ON public.scheduled_task_runs
  FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "service_runs_insert" ON public.scheduled_task_runs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "service_runs_update" ON public.scheduled_task_runs
  FOR UPDATE USING (true);
