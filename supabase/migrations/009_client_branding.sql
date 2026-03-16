-- Migration 009: Client Branding & Export
-- Tables: client_branding_config
-- Storage buckets: branding-assets, generated-exports

-- ============================================================
-- Table: client_branding_config
-- ============================================================
CREATE TABLE public.client_branding_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#64748b',
  font_family TEXT DEFAULT 'Inter' CHECK (font_family IN ('Inter', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Poppins')),
  slogan TEXT,
  address TEXT,
  phone TEXT,
  contact_email TEXT,
  website TEXT,
  legal_mentions TEXT,
  templates JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_branding_config_unique UNIQUE (client_id)
);

-- ============================================================
-- Storage Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding-assets',
  'branding-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'generated-exports',
  'generated-exports',
  false,
  52428800 -- 50MB
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.client_branding_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_branding_all" ON public.client_branding_config FOR ALL USING (public.is_admin());
CREATE POLICY "client_branding_select" ON public.client_branding_config FOR SELECT USING (client_id = public.get_my_client_id());
CREATE POLICY "client_branding_insert" ON public.client_branding_config FOR INSERT WITH CHECK (client_id = public.get_my_client_id());
CREATE POLICY "client_branding_update" ON public.client_branding_config FOR UPDATE USING (client_id = public.get_my_client_id());

-- Storage: branding-assets (per-client folders)
CREATE POLICY "branding_assets_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'branding-assets');

CREATE POLICY "branding_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'branding-assets'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = public.get_my_client_id()::text
    )
  );

CREATE POLICY "branding_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'branding-assets'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = public.get_my_client_id()::text
    )
  );

-- Storage: generated-exports (per-client folders)
CREATE POLICY "exports_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-exports'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = public.get_my_client_id()::text
    )
  );

CREATE POLICY "exports_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-exports'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = public.get_my_client_id()::text
    )
  );

CREATE POLICY "exports_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'generated-exports'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = public.get_my_client_id()::text
    )
  );
