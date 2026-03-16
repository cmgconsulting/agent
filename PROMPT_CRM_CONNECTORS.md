# Prompt Claude Code — Connecteurs CRM pour artisans ENR

## Contexte
Tu travailles sur un SaaS Next.js 14 (App Router) + Supabase + Tailwind CSS destiné aux artisans du secteur ENR (énergies renouvelables). Le logiciel contient 8 agents IA qui automatisent différentes tâches (social media, SAV, emails, devis, marketing, SOP, finances, data).

Les clients de ce logiciel utilisent des CRM/ERP métier français. Il faut créer un système de connecteurs CRM permettant aux agents d'accéder et d'automatiser des tâches dans ces outils en synchronisation bidirectionnelle.

## CRM à supporter
Les 8 CRM/ERP prioritaires (tous français, utilisés par les artisans ENR) :
1. **Axonaut** — CRM/ERP tout-en-un TPE/PME (API REST documentée)
2. **Obat** — Logiciel devis/facturation BTP (API disponible)
3. **Vertuoza** — ERP spécialisé construction/rénovation
4. **Toltek** — CRM dédié au BTP et à la rénovation énergétique
5. **Costructor** — Logiciel de gestion chantier BTP
6. **Graneet** — Plateforme de gestion des travaux et devis
7. **Extrabat** — Logiciel de gestion BTP/artisans (très répandu)
8. **Henrri** — Logiciel de facturation gratuit pour TPE

## Design System à respecter
- Couleurs : brand-50→900 (#FEC000), surface-*, ink-*
- Font : Bai Jamjuree
- Composants : cards avec bordures arrondies, icônes Lucide React
- Pattern existant : voir la page `/app/settings/connectors/page.tsx` si elle existe, sinon créer

## Feature 1 — Page UI des connecteurs CRM (`/app/settings/crm/page.tsx`)

Créer une page dans les paramètres qui affiche :

### Vue "Liste des CRM"
- Grille de cards (2-3 colonnes) avec pour chaque CRM :
  - Logo du CRM (placeholder SVG avec les initiales si pas de logo)
  - Nom du CRM
  - Description courte (1 ligne : "CRM/ERP tout-en-un pour TPE/PME")
  - Badge de statut : "Connecté" (vert) / "Non connecté" (gris) / "Erreur" (rouge)
  - Bouton "Connecter" (si non connecté) ou "Gérer" (si connecté)
  - Sous le bouton : "Dernière sync : il y a 2h" (si connecté)

### Vue "Détail d'une connexion" (modale ou page dédiée)
Quand on clique sur "Connecter" ou "Gérer" :
- Formulaire de connexion : champ API Key + URL d'instance (si applicable)
- OU flow OAuth2 (si le CRM le supporte)
- Test de connexion avec feedback visuel (spinner → ✓ succès / ✗ échec)
- Configuration de la sync :
  - Toggle ON/OFF pour chaque type de donnée : Contacts, Devis, Factures, Chantiers, Leads
  - Direction de sync par type : "CRM → App", "App → CRM", "Bidirectionnel"
  - Fréquence de sync : "Temps réel (webhook)", "Toutes les 15 min", "Toutes les heures", "Manuel"
- Bouton "Synchroniser maintenant"
- Journal des dernières syncs (tableau : date, type, nb d'éléments, statut, erreurs)

### Sidebar
Ajouter un lien "Connecteurs CRM" dans la catégorie Paramètres du sidebar, avec une icône `Link2` ou `Plug` de Lucide.

## Feature 2 — Tables Supabase

### Migration SQL à créer : `supabase/migrations/016_crm_connectors.sql`

```sql
-- Table des connexions CRM par client
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('axonaut', 'obat', 'vertuoza', 'toltek', 'costructor', 'graneet', 'extrabat', 'henrri')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  credentials JSONB NOT NULL DEFAULT '{}', -- API key, OAuth tokens (chiffré côté app)
  config JSONB NOT NULL DEFAULT '{}', -- sync settings par type de donnée
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'error')),
  last_sync_details JSONB DEFAULT '{}', -- nb items synced, errors
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

-- Mapping des entités CRM ↔ entités internes
CREATE TABLE IF NOT EXISTS crm_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES crm_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'devis', 'facture', 'chantier', 'lead')),
  internal_id TEXT NOT NULL, -- ID dans notre système
  external_id TEXT NOT NULL, -- ID dans le CRM
  external_data JSONB DEFAULT '{}', -- snapshot des données CRM
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
```

## Feature 3 — Service d'abstraction CRM (`src/lib/crm/`)

Créer une architecture modulaire :

### `src/lib/crm/types.ts`
```typescript
export type CRMType = 'axonaut' | 'obat' | 'vertuoza' | 'toltek' | 'costructor' | 'graneet' | 'extrabat' | 'henrri';

export interface CRMContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  type: 'particulier' | 'professionnel';
  source?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, any>; // données brutes du CRM
}

export interface CRMDevis {
  id: string;
  reference: string;
  contactId: string;
  amount: number;
  amountTTC: number;
  status: 'draft' | 'sent' | 'accepted' | 'refused' | 'expired';
  items: CRMDevisItem[];
  createdAt: string;
  validUntil?: string;
  raw: Record<string, any>;
}

export interface CRMDevisItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
}

export interface CRMFacture {
  id: string;
  reference: string;
  contactId: string;
  devisId?: string;
  amount: number;
  amountTTC: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  raw: Record<string, any>;
}

export interface CRMChantier {
  id: string;
  reference: string;
  contactId: string;
  address: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  product?: string; // PAC, solaire, poêle, etc.
  notes?: string;
  raw: Record<string, any>;
}

export interface CRMLead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  product?: string;
  notes?: string;
  createdAt: string;
  raw: Record<string, any>;
}

// Interface commune que chaque adaptateur CRM doit implémenter
export interface CRMAdapter {
  type: CRMType;

  // Connexion
  testConnection(credentials: Record<string, any>): Promise<{ success: boolean; error?: string }>;

  // Contacts
  getContacts(options?: { since?: string; limit?: number }): Promise<CRMContact[]>;
  getContact(id: string): Promise<CRMContact | null>;
  createContact(data: Partial<CRMContact>): Promise<CRMContact>;
  updateContact(id: string, data: Partial<CRMContact>): Promise<CRMContact>;

  // Devis
  getDevis(options?: { since?: string; limit?: number }): Promise<CRMDevis[]>;
  createDevis(data: Partial<CRMDevis>): Promise<CRMDevis>;

  // Factures
  getFactures(options?: { since?: string; limit?: number }): Promise<CRMFacture[]>;
  createFacture(data: Partial<CRMFacture>): Promise<CRMFacture>;

  // Chantiers
  getChantiers(options?: { since?: string; limit?: number }): Promise<CRMChantier[]>;
  updateChantier(id: string, data: Partial<CRMChantier>): Promise<CRMChantier>;

  // Leads
  getLeads(options?: { since?: string; limit?: number }): Promise<CRMLead[]>;
  createLead(data: Partial<CRMLead>): Promise<CRMLead>;
  updateLead(id: string, data: Partial<CRMLead>): Promise<CRMLead>;
}
```

### `src/lib/crm/adapters/axonaut.ts` (exemple d'implémentation)
Implémenter l'interface CRMAdapter pour Axonaut en utilisant leur API REST (https://axonaut.com/api).
Créer un fichier similaire pour chaque CRM, même si c'est un squelette avec des `throw new Error('Not implemented yet')` pour les CRM dont l'API n'est pas encore documentée.

### `src/lib/crm/crm-service.ts`
Service principal qui :
- Récupère la connexion CRM active de l'utilisateur
- Instancie le bon adaptateur selon le `crm_type`
- Expose des méthodes unifiées (getContacts, createLead, etc.)
- Gère les logs de sync dans `crm_sync_logs`
- Gère le mapping d'entités dans `crm_entity_mappings`

## Feature 4 — Intégration avec les agents

### Nouveaux tools dans `agent-framework.ts`

Ajouter des tools CRM dans les `typeSpecificTools` des agents concernés :

**Hugo** (marketing) : `crm_get_leads`, `crm_create_lead`, `crm_update_lead_status`, `crm_get_lead_stats`
**Leo** (opérations) : `crm_create_devis`, `crm_get_devis`, `crm_create_facture`, `crm_get_factures`, `crm_update_chantier`
**Marc** (emails) : `crm_get_contacts`, `crm_search_contact`, `crm_create_contact`
**Ludo** (SAV) : `crm_get_contact`, `crm_get_chantier`, `crm_update_contact_notes`
**Felix** (finances) : `crm_get_factures`, `crm_get_facture_stats`, `crm_get_impayees`
**Iris** (data) : `crm_get_all_stats` (contacts, devis, factures, chantiers — pour le reporting)

Chaque tool doit :
1. Vérifier que l'utilisateur a une connexion CRM active
2. Si non → informer l'utilisateur qu'il doit connecter son CRM dans Paramètres > Connecteurs CRM
3. Si oui → exécuter l'action via le CRMService
4. Logger l'activité

### Mise à jour des system prompts
Ajouter dans les prompts des agents concernés une mention de leur capacité CRM :
- Hugo : "Tu peux accéder au CRM du client pour créer/qualifier des leads et suivre le pipeline commercial"
- Leo : "Tu peux créer des devis et factures directement dans le CRM du client"
- Marc : "Tu peux rechercher et créer des contacts dans le CRM du client"
- etc.

## Feature 5 — Composants UI

### `src/components/crm/crm-connector-card.tsx`
Card réutilisable pour chaque CRM avec :
- Logo, nom, description
- Badge statut
- Bouton connexion/gestion

### `src/components/crm/crm-connection-modal.tsx`
Modale de connexion/configuration avec :
- Formulaire API key
- Test de connexion
- Configuration sync
- Journal des syncs

### `src/components/crm/crm-sync-status.tsx`
Widget compact affichable dans le dashboard montrant :
- CRM connecté (nom + logo petit)
- Dernière sync
- Nb contacts/devis/factures synchronisés

## Fichiers à NE PAS toucher
- `src/lib/agent-framework.ts` lignes 88-620 (system prompts) — sauf pour ajouter les mentions CRM dans les prompts
- `src/lib/preferences-injector.ts`
- `src/lib/conversation-manager.ts`

## Priorité d'implémentation
1. Migration SQL + types TypeScript
2. Page UI avec les 8 CRM cards (même sans connexion réelle)
3. CRMAdapter interface + service
4. Implémentation Axonaut (le plus documenté)
5. Tools agents + intégration agent-framework
6. Squelettes des 7 autres adaptateurs

## Notes techniques
- Stocker les API keys chiffrées (utiliser `pgcrypto` ou chiffrement côté app)
- Rate limiting sur les appels API CRM (respecter les limites de chaque API)
- Retry avec backoff exponentiel sur les erreurs temporaires
- Les credentials NE DOIVENT JAMAIS apparaître dans les logs
