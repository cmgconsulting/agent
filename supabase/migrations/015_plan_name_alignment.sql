-- Migration 015: Alignement des noms de plans
-- basic/pro/full → starter/pro/enterprise
-- Pour correspondre aux billing_plans de la migration 014

-- Aligner les noms de plans dans la table clients
UPDATE clients SET plan = 'starter' WHERE plan = 'basic';
UPDATE clients SET plan = 'enterprise' WHERE plan = 'full';
-- Le plan 'pro' reste inchange

-- Mettre a jour la contrainte CHECK
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_check;
ALTER TABLE clients ADD CONSTRAINT clients_plan_check
  CHECK (plan IN ('starter', 'pro', 'enterprise'));
