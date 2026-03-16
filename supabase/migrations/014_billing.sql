-- ============================================
-- Migration 014: Billing Plans & Token Consumption
-- ============================================

-- ─── Table: billing_plans ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  monthly_token_quota BIGINT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2),
  max_agents INTEGER DEFAULT 3,
  max_documents INTEGER DEFAULT 50,
  max_connectors INTEGER DEFAULT 5,
  max_team_members INTEGER DEFAULT 1,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Table: client_subscriptions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES billing_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'cancelled', 'suspended')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  tokens_used BIGINT DEFAULT 0,
  tokens_quota BIGINT NOT NULL,
  overage_allowed BOOLEAN DEFAULT false,
  overage_rate NUMERIC(10,6),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_client_subscriptions_client UNIQUE (client_id)
);

-- ─── Table: token_usage_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  conversation_id UUID,
  task_id UUID,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost NUMERIC(10,6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Table: token_usage_daily ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  agent_type TEXT NOT NULL,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  total_cost NUMERIC(10,4) DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_token_usage_daily UNIQUE (client_id, date, agent_type)
);

-- ─── Table: billing_alerts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_80', 'threshold_90', 'threshold_100', 'overage', 'plan_upgrade_suggested', 'plan_upgrade_required')),
  message TEXT NOT NULL,
  threshold_percent INTEGER,
  tokens_used BIGINT,
  tokens_quota BIGINT,
  suggested_plan_id UUID REFERENCES billing_plans(id),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_client_id ON token_usage_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON token_usage_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_agent ON token_usage_logs(client_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_token_usage_daily_client_date ON token_usage_daily(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_client ON billing_alerts(client_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_period_end ON client_subscriptions(current_period_end);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────
CREATE TRIGGER set_billing_plans_updated_at
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_client_subscriptions_updated_at
  BEFORE UPDATE ON client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Function: check_token_quota ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_token_quota(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_percent NUMERIC;
  v_allowed BOOLEAN;
  v_suggested_plan_id UUID;
BEGIN
  -- Get subscription
  SELECT * INTO v_sub FROM client_subscriptions
    WHERE client_id = p_client_id AND status IN ('active', 'trial')
    LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'no_active_subscription',
      'tokens_used', 0,
      'tokens_quota', 0,
      'percent_used', 0,
      'plan_name', null,
      'suggested_upgrade_plan_id', null
    );
  END IF;

  -- Get plan
  SELECT * INTO v_plan FROM billing_plans WHERE id = v_sub.plan_id;

  -- Calculate percent
  v_percent := CASE WHEN v_sub.tokens_quota > 0
    THEN ROUND((v_sub.tokens_used::NUMERIC / v_sub.tokens_quota::NUMERIC) * 100, 2)
    ELSE 0 END;

  -- Check if allowed
  v_allowed := (v_sub.tokens_used < v_sub.tokens_quota) OR v_sub.overage_allowed;

  -- Suggest next plan if over 90%
  IF v_percent >= 90 THEN
    SELECT id INTO v_suggested_plan_id FROM billing_plans
      WHERE monthly_token_quota > v_plan.monthly_token_quota
        AND is_active = true
      ORDER BY monthly_token_quota ASC
      LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'tokens_used', v_sub.tokens_used,
    'tokens_quota', v_sub.tokens_quota,
    'percent_used', v_percent,
    'plan_name', v_plan.display_name,
    'overage_allowed', v_sub.overage_allowed,
    'suggested_upgrade_plan_id', v_suggested_plan_id
  );
END;
$$;

-- ─── Function: log_token_usage ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_token_usage(
  p_client_id UUID,
  p_agent_type TEXT,
  p_model TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_estimated_cost NUMERIC DEFAULT 0,
  p_conversation_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_sub RECORD;
  v_percent NUMERIC;
  v_today DATE := CURRENT_DATE;
  v_suggested_plan_id UUID;
BEGIN
  v_total := p_input_tokens + p_output_tokens;

  -- 1. Insert log
  INSERT INTO token_usage_logs (client_id, agent_type, model, input_tokens, output_tokens, estimated_cost, conversation_id, task_id, metadata)
  VALUES (p_client_id, p_agent_type, p_model, p_input_tokens, p_output_tokens, p_estimated_cost, p_conversation_id, p_task_id, p_metadata);

  -- 2. Update subscription tokens_used
  UPDATE client_subscriptions
  SET tokens_used = tokens_used + v_total,
      updated_at = now()
  WHERE client_id = p_client_id AND status IN ('active', 'trial');

  -- 3. Upsert daily aggregate
  INSERT INTO token_usage_daily (client_id, date, agent_type, total_input_tokens, total_output_tokens, total_tokens, total_cost, request_count)
  VALUES (p_client_id, v_today, p_agent_type, p_input_tokens, p_output_tokens, v_total, p_estimated_cost, 1)
  ON CONFLICT (client_id, date, agent_type)
  DO UPDATE SET
    total_input_tokens = token_usage_daily.total_input_tokens + EXCLUDED.total_input_tokens,
    total_output_tokens = token_usage_daily.total_output_tokens + EXCLUDED.total_output_tokens,
    total_tokens = token_usage_daily.total_tokens + EXCLUDED.total_tokens,
    total_cost = token_usage_daily.total_cost + EXCLUDED.total_cost,
    request_count = token_usage_daily.request_count + 1;

  -- 4. Check thresholds and create alerts
  SELECT * INTO v_sub FROM client_subscriptions
    WHERE client_id = p_client_id AND status IN ('active', 'trial')
    LIMIT 1;

  IF v_sub IS NOT NULL AND v_sub.tokens_quota > 0 THEN
    v_percent := ROUND((v_sub.tokens_used::NUMERIC / v_sub.tokens_quota::NUMERIC) * 100, 2);

    -- Find suggested upgrade plan
    SELECT bp.id INTO v_suggested_plan_id
    FROM billing_plans bp
    JOIN billing_plans current_plan ON current_plan.id = v_sub.plan_id
    WHERE bp.monthly_token_quota > current_plan.monthly_token_quota
      AND bp.is_active = true
    ORDER BY bp.monthly_token_quota ASC
    LIMIT 1;

    -- 80% threshold
    IF v_percent >= 80 AND v_percent < 90 THEN
      IF NOT EXISTS (
        SELECT 1 FROM billing_alerts
        WHERE client_id = p_client_id AND alert_type = 'threshold_80'
          AND created_at >= v_sub.current_period_start
      ) THEN
        INSERT INTO billing_alerts (client_id, alert_type, message, threshold_percent, tokens_used, tokens_quota, suggested_plan_id)
        VALUES (p_client_id, 'threshold_80', 'Vous avez utilise 80% de votre quota de tokens mensuel.', 80, v_sub.tokens_used, v_sub.tokens_quota, v_suggested_plan_id);
      END IF;
    END IF;

    -- 90% threshold
    IF v_percent >= 90 AND v_percent < 100 THEN
      IF NOT EXISTS (
        SELECT 1 FROM billing_alerts
        WHERE client_id = p_client_id AND alert_type = 'threshold_90'
          AND created_at >= v_sub.current_period_start
      ) THEN
        INSERT INTO billing_alerts (client_id, alert_type, message, threshold_percent, tokens_used, tokens_quota, suggested_plan_id)
        VALUES (p_client_id, 'threshold_90', 'Vous avez utilise 90% de votre quota de tokens mensuel. Pensez a passer au plan superieur.', 90, v_sub.tokens_used, v_sub.tokens_quota, v_suggested_plan_id);
      END IF;
    END IF;

    -- 100% threshold
    IF v_percent >= 100 THEN
      IF NOT EXISTS (
        SELECT 1 FROM billing_alerts
        WHERE client_id = p_client_id AND alert_type = 'threshold_100'
          AND created_at >= v_sub.current_period_start
      ) THEN
        INSERT INTO billing_alerts (client_id, alert_type, message, threshold_percent, tokens_used, tokens_quota, suggested_plan_id)
        VALUES (p_client_id, 'threshold_100', 'Vous avez atteint 100% de votre quota de tokens mensuel.', 100, v_sub.tokens_used, v_sub.tokens_quota, v_suggested_plan_id);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'total_tokens', v_total, 'tokens_used', COALESCE(v_sub.tokens_used, 0));
END;
$$;

-- ─── Function: reset_monthly_usage ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE client_subscriptions
  SET
    tokens_used = 0,
    current_period_start = now(),
    current_period_end = CASE
      WHEN billing_cycle = 'monthly' THEN now() + interval '1 month'
      WHEN billing_cycle = 'yearly' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    updated_at = now()
  WHERE status IN ('active', 'trial')
    AND current_period_end <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_alerts ENABLE ROW LEVEL SECURITY;

-- billing_plans: everyone can read active plans, admin can manage
CREATE POLICY "billing_plans_select_all" ON billing_plans FOR SELECT USING (true);
CREATE POLICY "billing_plans_admin_all" ON billing_plans FOR ALL USING (is_admin());

-- client_subscriptions
CREATE POLICY "client_subscriptions_admin_all" ON client_subscriptions FOR ALL USING (is_admin());
CREATE POLICY "client_subscriptions_client_select" ON client_subscriptions FOR SELECT USING (client_id = get_my_client_id());

-- token_usage_logs
CREATE POLICY "token_usage_logs_admin_all" ON token_usage_logs FOR ALL USING (is_admin());
CREATE POLICY "token_usage_logs_client_select" ON token_usage_logs FOR SELECT USING (client_id = get_my_client_id());

-- token_usage_daily
CREATE POLICY "token_usage_daily_admin_all" ON token_usage_daily FOR ALL USING (is_admin());
CREATE POLICY "token_usage_daily_client_select" ON token_usage_daily FOR SELECT USING (client_id = get_my_client_id());

-- billing_alerts
CREATE POLICY "billing_alerts_admin_all" ON billing_alerts FOR ALL USING (is_admin());
CREATE POLICY "billing_alerts_client_select" ON billing_alerts FOR SELECT USING (client_id = get_my_client_id());
CREATE POLICY "billing_alerts_client_update" ON billing_alerts FOR UPDATE USING (client_id = get_my_client_id()) WITH CHECK (client_id = get_my_client_id());

-- ─── Seed data: 3 default plans ──────────────────────────────────────────────
INSERT INTO billing_plans (name, display_name, description, monthly_token_quota, price_monthly, price_yearly, max_agents, max_documents, max_connectors, max_team_members, features, sort_order) VALUES
(
  'starter',
  'Starter',
  'Ideal pour demarrer avec l''IA. 3 agents, quota genereux pour les petites structures.',
  100000,
  29.00,
  290.00,
  3,
  20,
  2,
  1,
  '{"workflows": false, "branding": false, "social_media": false, "advanced_analytics": false, "priority_support": false}',
  1
),
(
  'pro',
  'Pro',
  'Pour les entreprises en croissance. 8 agents, workflows et branding inclus.',
  500000,
  79.00,
  790.00,
  8,
  100,
  10,
  5,
  '{"workflows": true, "branding": true, "social_media": true, "advanced_analytics": true, "priority_support": false}',
  2
),
(
  'enterprise',
  'Enterprise',
  'Solution complete sans limites. Support prioritaire et toutes les fonctionnalites.',
  2000000,
  199.00,
  1990.00,
  -1,
  -1,
  -1,
  -1,
  '{"workflows": true, "branding": true, "social_media": true, "advanced_analytics": true, "priority_support": true, "custom_integrations": true, "dedicated_support": true}',
  3
)
ON CONFLICT (name) DO NOTHING;
