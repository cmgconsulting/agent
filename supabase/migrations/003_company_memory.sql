-- Migration 003: Company Memory for Agent Onboarding
-- Stores structured business knowledge collected during client onboarding

-- ============================================
-- TABLE: company_memory
-- ============================================

CREATE TABLE public.company_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Identite entreprise (Etape 1)
  company_description TEXT,
  founding_year INTEGER,
  geographic_zone TEXT,
  certifications TEXT[] DEFAULT '{}',
  team_size INTEGER,
  brand_values TEXT[] DEFAULT '{}',

  -- Catalogue & offres (Etape 2)
  products JSONB DEFAULT '[]',
  service_zone TEXT,
  intervention_delays TEXT,
  available_subsidies TEXT[] DEFAULT '{}',
  exclusion_zones TEXT,

  -- Commercial (Etape 3)
  typical_client_profile TEXT,
  sales_process TEXT,
  average_ticket NUMERIC,
  objections JSONB DEFAULT '[]',
  competitors TEXT[] DEFAULT '{}',
  differentiators TEXT[] DEFAULT '{}',

  -- Communication (Etape 4)
  tone_of_voice TEXT DEFAULT 'professionnel',
  formal_address BOOLEAN DEFAULT TRUE,
  words_to_avoid TEXT[] DEFAULT '{}',
  example_messages JSONB DEFAULT '[]',
  email_signature TEXT,

  -- SAV & Finance (Etape 5)
  sav_scripts JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  emergency_contact TEXT,
  response_delay TEXT,
  target_margin NUMERIC DEFAULT 30,
  hourly_rate NUMERIC,
  payment_reminder_process TEXT,

  -- Donnees brutes
  raw_responses JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id)
);

-- Index
CREATE INDEX idx_company_memory_client_id ON public.company_memory(client_id);

-- ============================================
-- RLS sur company_memory
-- ============================================

ALTER TABLE public.company_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on company_memory"
  ON public.company_memory FOR ALL
  USING (public.is_admin());

CREATE POLICY "Clients can view own company memory"
  ON public.company_memory FOR SELECT
  USING (client_id = public.get_my_client_id());

CREATE POLICY "Clients can update own company memory"
  ON public.company_memory FOR UPDATE
  USING (client_id = public.get_my_client_id());

-- ============================================
-- Colonnes onboarding sur clients
-- ============================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_score INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- Trigger: auto-create company_memory row
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_client_memory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_memory (client_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_created_memory
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_memory();

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE TRIGGER set_updated_at_company_memory
  BEFORE UPDATE ON public.company_memory
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
