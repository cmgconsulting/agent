-- CMG Agents - Database Schema
-- Sprint 1: Fondations & Multi-tenant

-- ============================================
-- TYPES ENUM
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'client');
CREATE TYPE plan_type AS ENUM ('basic', 'pro', 'full');
CREATE TYPE agent_type AS ENUM ('eva', 'ludo', 'marc', 'leo', 'hugo', 'sofia', 'felix', 'iris');
CREATE TYPE connector_type AS ENUM (
  'gmail', 'outlook', 'brevo', 'mailchimp',
  'whatsapp', 'twilio',
  'meta_api', 'linkedin_api',
  'meta_ads', 'google_ads',
  'airtable', 'hubspot',
  'notion', 'google_docs',
  'canva',
  'google_analytics',
  'pennylane', 'sellsy', 'quickbooks', 'google_sheets',
  'make_com'
);
CREATE TYPE connector_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE action_status AS ENUM ('pending', 'approved', 'rejected', 'executed', 'failed');
CREATE TYPE log_status AS ENUM ('success', 'error', 'warning', 'info');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'client',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients (entreprises ENR)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  plan plan_type NOT NULL DEFAULT 'basic',
  active_agents agent_type[] NOT NULL DEFAULT '{}',
  phone TEXT,
  address TEXT,
  siret TEXT,
  onboarded_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Connectors (intégrations par client)
CREATE TABLE public.connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type connector_type NOT NULL,
  label TEXT, -- nom personnalisé (ex: "Gmail principal")
  credentials_encrypted TEXT, -- credentials chiffrées
  status connector_status NOT NULL DEFAULT 'inactive',
  last_tested_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agents (configuration par client)
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type agent_type NOT NULL,
  name TEXT NOT NULL, -- nom affiché (Eva, Ludo, etc.)
  active BOOLEAN NOT NULL DEFAULT false,
  system_prompt TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, type)
);

-- Agent Logs (activité des agents)
CREATE TABLE public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status log_status NOT NULL DEFAULT 'info',
  payload_summary TEXT,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pending Actions (actions en attente de validation)
CREATE TABLE public.pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}',
  status action_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPIs (métriques hebdomadaires)
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  week DATE NOT NULL, -- lundi de la semaine
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin Audit Log (traçabilité admin)
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT, -- 'client', 'agent', 'connector'
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_connectors_client_id ON public.connectors(client_id);
CREATE INDEX idx_agents_client_id ON public.agents(client_id);
CREATE INDEX idx_agent_logs_agent_id ON public.agent_logs(agent_id);
CREATE INDEX idx_agent_logs_client_id ON public.agent_logs(client_id);
CREATE INDEX idx_agent_logs_created_at ON public.agent_logs(created_at DESC);
CREATE INDEX idx_pending_actions_client_id ON public.pending_actions(client_id);
CREATE INDEX idx_pending_actions_status ON public.pending_actions(status);
CREATE INDEX idx_kpis_client_id ON public.kpis(client_id);
CREATE INDEX idx_kpis_week ON public.kpis(week);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get client_id for current user
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS UUID AS $$
  SELECT id FROM public.clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- CLIENTS policies
CREATE POLICY "Admins can do everything on clients"
  ON public.clients FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own record"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Clients can update own record"
  ON public.clients FOR UPDATE
  USING (user_id = auth.uid());

-- CONNECTORS policies
CREATE POLICY "Admins can do everything on connectors"
  ON public.connectors FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own connectors"
  ON public.connectors FOR SELECT
  USING (client_id = public.get_my_client_id());

-- AGENTS policies
CREATE POLICY "Admins can do everything on agents"
  ON public.agents FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own agents"
  ON public.agents FOR SELECT
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can update own agents config"
  ON public.agents FOR UPDATE
  USING (client_id = public.get_my_client_id());

-- AGENT_LOGS policies
CREATE POLICY "Admins can view all logs"
  ON public.agent_logs FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own logs"
  ON public.agent_logs FOR SELECT
  USING (client_id = public.get_my_client_id());

-- PENDING_ACTIONS policies
CREATE POLICY "Admins can do everything on pending_actions"
  ON public.pending_actions FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own pending actions"
  ON public.pending_actions FOR SELECT
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can update own pending actions"
  ON public.pending_actions FOR UPDATE
  USING (client_id = public.get_my_client_id());

-- KPIS policies
CREATE POLICY "Admins can do everything on kpis"
  ON public.kpis FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own kpis"
  ON public.kpis FOR SELECT
  USING (client_id = public.get_my_client_id());

-- ADMIN_AUDIT_LOG policies
CREATE POLICY "Only admins can access audit log"
  ON public.admin_audit_log FOR ALL
  USING (public.is_admin());

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_connectors
  BEFORE UPDATE ON public.connectors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_agents
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create 8 agents when a client is created
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER AS $$
DECLARE
  agent_names JSONB := '{
    "eva": "Eva", "ludo": "Ludo", "marc": "Marc", "leo": "Leo",
    "hugo": "Hugo", "sofia": "Sofia", "felix": "Felix", "iris": "Iris"
  }'::JSONB;
  agent_key TEXT;
BEGIN
  FOR agent_key IN SELECT jsonb_object_keys(agent_names) LOOP
    INSERT INTO public.agents (client_id, type, name, active)
    VALUES (
      NEW.id,
      agent_key::agent_type,
      agent_names->>agent_key,
      agent_key::agent_type = ANY(NEW.active_agents)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client();
