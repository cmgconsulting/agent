-- Migration 007: Workflows inter-agents
-- Tables: workflows, workflow_steps, workflow_executions, workflow_step_results

-- ============================================================
-- Table: workflows
-- ============================================================
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'schedule', 'event', 'webhook')),
  trigger_config JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_client ON public.workflows(client_id);

-- ============================================================
-- Table: workflow_steps
-- ============================================================
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  prompt_template TEXT NOT NULL,
  condition JSONB,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  on_error TEXT NOT NULL DEFAULT 'stop' CHECK (on_error IN ('stop', 'skip', 'retry')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_steps_workflow ON public.workflow_steps(workflow_id, step_order);

-- ============================================================
-- Table: workflow_executions
-- ============================================================
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  trigger_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id, started_at DESC);
CREATE INDEX idx_workflow_executions_client ON public.workflow_executions(client_id, started_at DESC);

-- ============================================================
-- Table: workflow_step_results
-- ============================================================
CREATE TABLE public.workflow_step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id),
  input JSONB DEFAULT '{}',
  output TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'skipped')),
  duration_ms INTEGER,
  tokens_used INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_step_results_execution ON public.workflow_step_results(execution_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_results ENABLE ROW LEVEL SECURITY;

-- workflows
CREATE POLICY "admin_workflows_all" ON public.workflows FOR ALL USING (public.is_admin());
CREATE POLICY "client_workflows_select" ON public.workflows FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "client_workflows_insert" ON public.workflows FOR INSERT WITH CHECK (client_id = public.get_my_client_id());
CREATE POLICY "client_workflows_update" ON public.workflows FOR UPDATE USING (client_id = public.get_my_client_id());
CREATE POLICY "client_workflows_delete" ON public.workflows FOR DELETE USING (client_id = public.get_my_client_id());

-- workflow_steps (access through workflow ownership)
CREATE POLICY "admin_steps_all" ON public.workflow_steps FOR ALL USING (public.is_admin());
CREATE POLICY "client_steps_select" ON public.workflow_steps
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND w.client_id = public.get_my_client_id()));
CREATE POLICY "client_steps_insert" ON public.workflow_steps
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND w.client_id = public.get_my_client_id()));
CREATE POLICY "client_steps_update" ON public.workflow_steps
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND w.client_id = public.get_my_client_id()));
CREATE POLICY "client_steps_delete" ON public.workflow_steps
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND w.client_id = public.get_my_client_id()));

-- workflow_executions
CREATE POLICY "admin_executions_all" ON public.workflow_executions FOR ALL USING (public.is_admin());
CREATE POLICY "client_executions_select" ON public.workflow_executions FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "service_executions_insert" ON public.workflow_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "service_executions_update" ON public.workflow_executions FOR UPDATE USING (true);

-- workflow_step_results
CREATE POLICY "admin_step_results_all" ON public.workflow_step_results FOR ALL USING (public.is_admin());
CREATE POLICY "client_step_results_select" ON public.workflow_step_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.workflow_executions e WHERE e.id = execution_id AND e.client_id = public.get_my_client_id()));
CREATE POLICY "service_step_results_insert" ON public.workflow_step_results FOR INSERT WITH CHECK (true);
CREATE POLICY "service_step_results_update" ON public.workflow_step_results FOR UPDATE USING (true);
