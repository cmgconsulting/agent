-- ============================================
-- CRM Connectors tables
-- ============================================

-- Table des connexions CRM par client
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('axonaut', 'obat', 'vertuoza', 'toltek', 'costructor', 'graneet', 'extrabat', 'henrri')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  credentials_encrypted TEXT, -- encrypted via app-level AES-256-GCM
  config JSONB NOT NULL DEFAULT '{}', -- sync settings par type de donnée
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'error')),
  last_sync_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, crm_type)
);

-- Journal de synchronisation
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('contacts', 'devis', 'factures', 'chantiers', 'leads', 'full')),
  direction TEXT NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'partial', 'error')),
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mapping des entités CRM <-> entités internes
CREATE TABLE IF NOT EXISTS crm_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'devis', 'facture', 'chantier', 'lead')),
  internal_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_data JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, entity_type, external_id)
);

-- RLS
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_entity_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own CRM connections"
  ON crm_connections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sync logs"
  ON crm_sync_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own entity mappings"
  ON crm_entity_mappings FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_crm_connections_user ON crm_connections(user_id);
CREATE INDEX idx_crm_sync_logs_connection ON crm_sync_logs(connection_id);
CREATE INDEX idx_crm_entity_mappings_lookup ON crm_entity_mappings(connection_id, entity_type, external_id);

-- Trigger updated_at
CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
