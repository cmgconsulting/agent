-- Migration 004: Custom Connectors (API REST & MCP)
-- Allows clients to create their own connectors to external services

-- ============================================
-- TABLE: custom_connectors
-- ============================================

CREATE TABLE public.custom_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- General info
  name TEXT NOT NULL,
  description TEXT,
  connector_type TEXT NOT NULL CHECK (connector_type IN ('api_rest', 'mcp')),

  -- API REST config
  base_url TEXT,
  http_method TEXT DEFAULT 'GET' CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  auth_method TEXT NOT NULL DEFAULT 'none' CHECK (auth_method IN ('api_key', 'oauth2', 'bearer_token', 'basic_auth', 'none')),
  credentials_encrypted TEXT,
  custom_headers JSONB DEFAULT '{}',

  -- MCP config
  mcp_config JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_error TEXT,
  last_tested_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_custom_connectors_client_id ON public.custom_connectors(client_id);
CREATE INDEX idx_custom_connectors_status ON public.custom_connectors(client_id, status);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.custom_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on custom_connectors"
  ON public.custom_connectors FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own custom connectors"
  ON public.custom_connectors FOR SELECT
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can create own custom connectors"
  ON public.custom_connectors FOR INSERT
  WITH CHECK (client_id = public.get_my_client_id());

CREATE POLICY "Clients can update own custom connectors"
  ON public.custom_connectors FOR UPDATE
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can delete own custom connectors"
  ON public.custom_connectors FOR DELETE
  USING (client_id = public.get_my_client_id());

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE TRIGGER set_updated_at_custom_connectors
  BEFORE UPDATE ON public.custom_connectors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
