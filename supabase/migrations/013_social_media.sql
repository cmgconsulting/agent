-- ============================================
-- Migration 013: Social Media Integration
-- Tables: social_accounts, social_posts, social_analytics, social_campaigns
-- Storage bucket: social-media
-- ============================================

-- Social accounts (connected platforms)
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'google_ads')),
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  display_name TEXT,
  profile_image_url TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  page_id TEXT,
  page_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'error')),
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_social_accounts_unique ON public.social_accounts (client_id, platform, platform_user_id);
CREATE INDEX idx_social_accounts_client ON public.social_accounts (client_id);
CREATE INDEX idx_social_accounts_status ON public.social_accounts (client_id, status);

-- Social campaigns
CREATE TABLE public.social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  objective TEXT CHECK (objective IN ('awareness', 'traffic', 'engagement', 'leads', 'sales')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  budget_total NUMERIC(10,2),
  budget_daily NUMERIC(10,2),
  budget_spent NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  target_audience JSONB DEFAULT '{}',
  ad_accounts JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_social_campaigns_client ON public.social_campaigns (client_id);
CREATE INDEX idx_social_campaigns_status ON public.social_campaigns (client_id, status);

-- Social posts
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  post_type TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'carousel', 'story', 'reel')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  campaign_id UUID REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  engagement JSONB DEFAULT '{}',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_social_posts_client ON public.social_posts (client_id);
CREATE INDEX idx_social_posts_account ON public.social_posts (social_account_id);
CREATE INDEX idx_social_posts_status ON public.social_posts (client_id, status);
CREATE INDEX idx_social_posts_campaign ON public.social_posts (campaign_id);
CREATE INDEX idx_social_posts_scheduled ON public.social_posts (scheduled_at) WHERE status = 'scheduled';

-- Social analytics (daily metrics per account)
CREATE TABLE public.social_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_date DATE NOT NULL,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  impressions INT DEFAULT 0,
  reach INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  clicks INT DEFAULT 0,
  saves INT DEFAULT 0,
  profile_views INT DEFAULT 0,
  website_clicks INT DEFAULT 0,
  audience_data JSONB DEFAULT '{}',
  raw_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_social_analytics_unique ON public.social_analytics (social_account_id, metric_date);
CREATE INDEX idx_social_analytics_client_date ON public.social_analytics (client_id, platform, metric_date);

-- Updated_at triggers
CREATE TRIGGER set_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_social_campaigns_updated_at BEFORE UPDATE ON public.social_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_social_accounts" ON public.social_accounts FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_social_posts" ON public.social_posts FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_social_analytics" ON public.social_analytics FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_social_campaigns" ON public.social_campaigns FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Client own data
CREATE POLICY "client_social_accounts" ON public.social_accounts FOR ALL
  USING (client_id = get_my_client_id()) WITH CHECK (client_id = get_my_client_id());
CREATE POLICY "client_social_posts" ON public.social_posts FOR ALL
  USING (client_id = get_my_client_id()) WITH CHECK (client_id = get_my_client_id());
CREATE POLICY "client_social_analytics" ON public.social_analytics FOR ALL
  USING (client_id = get_my_client_id()) WITH CHECK (client_id = get_my_client_id());
CREATE POLICY "client_social_campaigns" ON public.social_campaigns FOR ALL
  USING (client_id = get_my_client_id()) WITH CHECK (client_id = get_my_client_id());

-- ============================================
-- Storage bucket for social media files
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('social-media', 'social-media', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: clients can manage their own files (path: client_id/...)
CREATE POLICY "social_media_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = get_my_client_id()::text);

CREATE POLICY "social_media_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = get_my_client_id()::text);

CREATE POLICY "social_media_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = get_my_client_id()::text);

-- Admin storage access
CREATE POLICY "admin_social_media_all" ON storage.objects FOR ALL
  USING (bucket_id = 'social-media' AND is_admin())
  WITH CHECK (bucket_id = 'social-media' AND is_admin());
