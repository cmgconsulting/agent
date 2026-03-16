-- Migration 015: Système de préférences et mémoire IA par utilisateur
-- Permet l'auto-amélioration de chaque agent pour chaque client

-- Table des préférences utilisateur (mémoire IA)
CREATE TABLE IF NOT EXISTS client_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'eva', 'ludo', etc. ou 'global' pour toutes les agents

  -- Préférences en langage naturel (mode simple)
  preference_key TEXT NOT NULL, -- ex: 'tone', 'format', 'language', 'custom'
  preference_value TEXT NOT NULL, -- ex: 'Ton formel et professionnel', 'Toujours inclure le prix TTC'

  -- Métadonnées
  source TEXT NOT NULL DEFAULT 'user', -- 'user' (saisi manuellement), 'feedback' (détecté via feedback), 'admin'
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un client ne peut pas avoir deux fois la même clé pour le même agent
  UNIQUE(client_id, agent_type, preference_key)
);

-- Table des prompts personnalisés par agent par client (mode avancé)
CREATE TABLE IF NOT EXISTS client_agent_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,

  -- Prompt additionnel (ajouté au prompt système de base)
  custom_prompt TEXT NOT NULL DEFAULT '',

  -- Si true, le custom_prompt REMPLACE le prompt par défaut au lieu de s'y ajouter
  replace_default BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, agent_type)
);

-- Table de l'historique des feedbacks (pour analyse)
CREATE TABLE IF NOT EXISTS feedback_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,

  -- Contexte du feedback
  user_message TEXT NOT NULL, -- Le message original de l'utilisateur
  agent_response TEXT NOT NULL, -- La réponse que l'agent a donnée
  dissatisfaction_message TEXT NOT NULL, -- Le message d'insatisfaction de l'utilisateur

  -- Résolution
  resolution_type TEXT NOT NULL, -- 'retry' (relancé), 'preference_saved' (préférence mémorisée), 'prompt_modified', 'dismissed'
  preference_created_id UUID REFERENCES client_preferences(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_client_preferences_client ON client_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_agent ON client_preferences(client_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_client_agent_prompts_client ON client_agent_prompts(client_id);
CREATE INDEX IF NOT EXISTS idx_feedback_history_client ON feedback_history(client_id);

-- RLS
ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_history ENABLE ROW LEVEL SECURITY;

-- Politique : le client voit/modifie ses propres préférences
CREATE POLICY "client_preferences_own" ON client_preferences
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- L'admin voit tout
CREATE POLICY "client_preferences_admin" ON client_preferences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "client_agent_prompts_own" ON client_agent_prompts
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "client_agent_prompts_admin" ON client_agent_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "feedback_history_own" ON feedback_history
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE POLICY "feedback_history_admin" ON feedback_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_preferences_updated_at
  BEFORE UPDATE ON client_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_agent_prompts_updated_at
  BEFORE UPDATE ON client_agent_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
