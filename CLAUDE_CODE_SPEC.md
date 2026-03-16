# Cahier des charges — Refonte UI/UX + Avatars Agents

## Contexte
CMG Agents est une plateforme SaaS multi-tenant avec 8 agents IA pour les artisans ENR (énergie renouvelable). Les clients sont des **artisans peu habitués à l'informatique**. L'interface doit être simple, épurée, explicite, avec des aides contextuelles.

---

## 1. Design System déjà en place

### Couleurs (tailwind.config.ts) — NE PAS MODIFIER
```
brand: { 50-900 } → couleur primaire #FEC000 (jaune/or)
surface: { 50-300 } → fonds neutres chauds
ink: { 50-700 } → texte du plus clair au plus foncé
```

### Typographie — NE PAS MODIFIER
- Police : **Bai Jamjuree** (Google Font) — déjà configurée dans layout.tsx et globals.css
- Weights : 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Composants CSS (globals.css) — UTILISER PARTOUT
- `.btn-brand` → bouton principal jaune
- `.btn-secondary` → bouton blanc bordé
- `.btn-ghost` → bouton texte/ghost
- `.card` → carte blanche arrondie avec ombre douce
- `.card-interactive` → carte avec hover lift
- `.input` → champ de saisie
- `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`, `.badge-brand` → badges colorés
- `.section-title`, `.section-subtitle` → titres de section

### Ombres (tailwind.config.ts)
- `shadow-soft` → ombre légère par défaut
- `shadow-card` → ombre carte au hover
- `shadow-hover` → ombre forte interaction
- `shadow-brand` → ombre jaune pour boutons brand

### Animations (tailwind.config.ts)
- `animate-fade-in` → apparition en fondu
- `animate-slide-up` → apparition depuis le bas
- `animate-slide-in-right` → apparition depuis la gauche
- `animate-pulse-soft` → pulsation douce
- `animate-bounce-soft` → rebond léger

### Coins arrondis
- Cartes : `rounded-2xl` (1rem)
- Boutons : `rounded-2xl`
- Inputs : `rounded-xl`
- Badges : `rounded-full`
- Icônes conteneurs : `rounded-xl`

---

## 2. Composants UI déjà créés — UTILISER PARTOUT

### `src/components/ui/page-header.tsx`
```tsx
import { PageHeader } from '@/components/ui/page-header'
<PageHeader
  title="Titre"
  subtitle="Sous-titre explicatif"
  icon={LucideIcon}
  action={{ label: "Action", href: "/path" }}
/>
```

### `src/components/ui/stat-card.tsx`
```tsx
import { StatCard } from '@/components/ui/stat-card'
<StatCard label="Actions" value={42} icon={Activity} helpText="Nombre total cette semaine" />
```

### `src/components/ui/empty-state.tsx`
```tsx
import { EmptyState } from '@/components/ui/empty-state'
<EmptyState type="rocket" title="Pas encore de données" message="Configurez vos agents pour commencer" />
// Types disponibles : "rocket" | "search" | "chart" | "team" | "chat"
```

### `src/components/ui/help-tooltip.tsx`
```tsx
import { HelpTooltip, SectionHelp } from '@/components/ui/help-tooltip'
<HelpTooltip text="Explication de ce bouton ou champ" />
<SectionHelp tips={["Conseil 1", "Conseil 2"]} />
```

### `src/components/ui/guided-tour.tsx`
```tsx
import { GuidedTour, DashboardTour } from '@/components/ui/guided-tour'
<DashboardTour /> // Ajouté au dashboard client uniquement
```

### `src/components/ui/logo.tsx`
```tsx
import { Logo } from '@/components/ui/logo'
<Logo size="sm" /> // "sm" | "md" | "lg"
```

### `src/components/agents/agent-avatars.tsx` ← NOUVEAU
```tsx
import { AgentAvatar } from '@/components/agents/agent-avatars'
<AgentAvatar type="eva" size="md" />
// Sizes : "sm" (48x60) | "md" (80x100) | "lg" (160x200) | "xl" (260x320)
// Types : "eva" | "ludo" | "marc" | "leo" | "hugo" | "sofia" | "felix" | "iris"
```

---

## 3. Fichiers déjà migrés (NE PAS RETOUCHER)

| Fichier | Statut |
|---------|--------|
| `tailwind.config.ts` | ✅ Complet |
| `src/app/globals.css` | ✅ Complet |
| `src/app/layout.tsx` | ✅ Complet (Bai Jamjuree) |
| `src/app/login/page.tsx` | ✅ Complet (split-screen, eye toggle) |
| `src/components/sidebar.tsx` | ✅ Complet (catégorisé, tooltips) |
| `src/app/dashboard/page.tsx` | ✅ Complet (greeting, onboarding) |
| `src/app/dashboard/layout.tsx` | ✅ Complet (bg-surface-50) |
| `src/app/admin/layout.tsx` | ✅ Complet (bg-surface-50) |
| `src/app/dashboard/loading.tsx` | ✅ Complet |
| `src/app/not-found.tsx` | ✅ Complet |
| `src/components/notification-bell.tsx` | ✅ Complet |
| `src/components/token-quota-alert.tsx` | ✅ Complet |
| `src/components/agents/agent-avatars.tsx` | ✅ Complet (8 avatars pro) |
| `src/components/feedback-assistant.tsx` | ✅ Complet (détection insatisfaction) |
| `src/app/dashboard/settings/preferences/page.tsx` | ✅ Complet (page préférences IA) |
| `src/lib/preferences-injector.ts` | ✅ Complet (injection prompt) |
| Tous les `src/components/ui/*.tsx` | ✅ Complet |

---

## 4. TÂCHES À RÉALISER — Pages à migrer

### Règles de migration pour CHAQUE page :

1. **Remplacer les emojis d'agents** par `<AgentAvatar type={agent.type} size="sm" />` (ou "md" pour les pages détail)
2. **Utiliser les classes CSS** : `.card`, `.card-interactive`, `.btn-brand`, `.btn-secondary`, `.input`, `.badge-*`
3. **Ajouter `<SectionHelp>` ou `<HelpTooltip>`** sur les sections complexes
4. **Utiliser `<PageHeader>`** en haut de chaque page (remplacer les h1 manuels)
5. **Utiliser `<EmptyState>`** quand il n'y a pas de données
6. **Animations** : `animate-fade-in` sur le conteneur racine, `animate-slide-up` sur les cartes avec `animationDelay`
7. **Texte en français simple** — pas de jargon technique, phrases courtes
8. **Fond** : `bg-surface-50` sur les layouts, `bg-white` sur les cartes
9. **Arrondi** : `rounded-2xl` sur les cartes, `rounded-xl` sur les boutons/inputs
10. **Ombres** : `shadow-soft` par défaut, `shadow-card` au hover

### Table de correspondance des couleurs à remplacer :

| Ancien | Nouveau |
|--------|---------|
| `bg-gray-50/100` | `bg-surface-50/100` |
| `bg-gray-200/300` | `bg-surface-200/300` |
| `text-gray-400` | `text-ink-200` |
| `text-gray-500` | `text-ink-300` |
| `text-gray-600` | `text-ink-400` |
| `text-gray-700` | `text-ink-500` |
| `text-gray-800/900` | `text-ink-600/700` |
| `border-gray-*` | `border-surface-*` |
| `bg-blue-500/600` (boutons) | `bg-brand-400/500` |
| `text-white` (sur blue btn) | `text-ink-700` (sur brand btn) |
| `rounded-lg` | `rounded-xl` ou `rounded-2xl` |
| `shadow-sm/md` | `shadow-soft/card` |
| `bg-yellow-*` | `bg-brand-*` ou `bg-amber-*` |
| `bg-green-*` | `bg-emerald-*` |

---

### 4.1 Pages ADMIN à migrer

#### `src/app/admin/page.tsx` — Dashboard Admin
- [x] Utilise déjà le design system (brand-*, ink-*, surface-*, card, btn-brand, etc.)
- [ ] Remplacer les emojis d'agents (`agent.icon` / `config.icon`) par `<AgentAvatar type={agent.type} size="sm" />`
- [ ] Ajouter `<PageHeader>` en haut
- [ ] Table des clients : ajouter un `hover:bg-surface-50` (déjà fait), s'assurer des `rounded-2xl`

#### `src/app/admin/agents/page.tsx`
- [ ] Migrer vers design system
- [ ] Utiliser `<AgentAvatar>` à la place des emojis
- [ ] Utiliser `.card-interactive` pour les cartes agents
- [ ] Ajouter `<SectionHelp>` avec explication admin

#### `src/app/admin/analytics/page.tsx`
- [ ] Migrer vers design system
- [ ] Utiliser `<StatCard>` pour les métriques
- [ ] Graphiques : bordures `surface-200`, fonds `surface-50`

#### `src/app/admin/billing/page.tsx`
- [ ] Migrer vers design system
- [ ] `<PageHeader>` + `<StatCard>`

#### `src/app/admin/clients/page.tsx`
- [ ] Migrer vers design system

#### `src/app/admin/clients/[id]/page.tsx`
- [ ] Vue détail client — utiliser `.card`, couleurs ink/surface
- [ ] Remplacer emojis agents par `<AgentAvatar>`

#### `src/app/admin/clients/[id]/branding/page.tsx`
- [ ] Migrer

#### `src/app/admin/clients/[id]/connectors/page.tsx` + `connector-manager.tsx`
- [ ] Migrer les 2 fichiers

#### `src/app/admin/clients/[id]/prompts/page.tsx`
- [ ] Migrer

#### `src/app/admin/clients/new/page.tsx`
- [ ] Formulaire : utiliser `.input`, `.btn-brand`, `rounded-2xl`

#### `src/app/admin/docs/page.tsx`
- [ ] Migrer

#### `src/app/admin/logs/page.tsx`
- [ ] Migrer vers design system, utiliser les dot status colorés

#### `src/app/admin/onboarding/page.tsx`
- [ ] Migrer

#### `src/app/admin/settings/page.tsx`
- [ ] Migrer — `.card`, `.input`, `.btn-brand`

#### `src/app/admin/loading.tsx` + `error.tsx`
- [ ] Migrer comme `dashboard/loading.tsx` (skeleton avec surface-*)

---

### 4.2 Pages DASHBOARD (Client) à migrer

#### `src/app/dashboard/agents/page.tsx` — Liste des agents
- [ ] Remplacer `{config.icon}` (emoji) par `<AgentAvatar type={agent.type} size="sm" />`
- [ ] Ajouter `<PageHeader icon={Bot} title="Mes Agents" subtitle="...">`
- [ ] Ajouter `<SectionHelp tips={["Cliquez sur un agent pour discuter", "..."]}/>`
- [ ] Utiliser `.card-interactive` (déjà fait)

#### `src/app/dashboard/agents/[agentId]/page.tsx` + `agent-detail-client.tsx`
- [ ] Remplacer emoji agent par `<AgentAvatar type={agent.type} size="lg" />` dans le header
- [ ] Chat : bulle user = `bg-brand-400 text-ink-700`, bulle agent = `bg-surface-100`
- [ ] Onglets : arrondir `rounded-xl`
- [ ] Ajouter `<HelpTooltip>` sur les onglets (Chat, Logs, Actions)

#### `src/app/dashboard/analytics/page.tsx`
- [ ] Migrer, utiliser `<StatCard>`, `<PageHeader>`

#### `src/app/dashboard/billing/page.tsx`
- [ ] Migrer — plans avec `.card`, prix en `text-brand-500`

#### `src/app/dashboard/connectors/page.tsx` + `custom/page.tsx`
- [ ] Migrer les 2 pages
- [ ] Status connecteurs : `.badge-success`, `.badge-error`, `.badge-warning`
- [ ] Ajouter `<SectionHelp>` ("Les connecteurs relient vos outils à vos agents")

#### `src/app/dashboard/conversations/page.tsx`
- [ ] Migrer

#### `src/app/dashboard/docs/page.tsx`
- [ ] Migrer

#### `src/app/dashboard/knowledge/page.tsx`
- [ ] Migrer — upload zone avec `border-dashed border-2 border-surface-300`

#### `src/app/dashboard/kpis/page.tsx`
- [ ] Migrer, utiliser `<StatCard>`

#### `src/app/dashboard/onboarding/page.tsx`
- [ ] Migrer — étapes avec progress bar brand, icônes

#### `src/app/dashboard/settings/branding/page.tsx`
- [ ] Migrer — formulaire `.input`, color picker

#### `src/app/dashboard/settings/team/page.tsx`
- [ ] Migrer — table membres, badges rôles

#### `src/app/dashboard/social/page.tsx` + sous-pages
- [ ] `social/page.tsx` — Migrer hub réseaux sociaux
- [ ] `social/accounts/page.tsx` — Comptes connectés
- [ ] `social/analytics/page.tsx` — Stats sociales
- [ ] `social/campaigns/page.tsx` — Campagnes
- [ ] `social/publish/page.tsx` — Publication
- [ ] Utiliser `<AgentAvatar type="eva" />` (Eva gère les réseaux)

#### `src/app/dashboard/tasks/page.tsx`
- [ ] Migrer — statuts avec `.badge-*`

#### `src/app/dashboard/workflows/page.tsx`
- [ ] Migrer — workflow builder avec `.card`, `.btn-secondary`

#### `src/app/dashboard/error.tsx`
- [ ] Migrer comme `not-found.tsx`

---

### 4.3 Page d'accueil

#### `src/app/page.tsx`
- [ ] Migrer vers design system
- [ ] Utiliser le logo CMG Agent
- [ ] Rediriger vers `/login` ou `/dashboard` selon l'auth

#### `src/app/login/layout.tsx`
- [ ] S'assurer qu'il utilise `bg-surface-50`

---

## 5. Remplacement global des emojis d'agents

Dans `src/lib/agents-config.ts`, chaque agent a un champ `icon` qui est un emoji (📱, 🎧, 📧, etc.). **PARTOUT** où `config.icon` ou `agent.icon` est affiché comme texte (`<span>{config.icon}</span>`), remplacer par :

```tsx
import { AgentAvatar } from '@/components/agents/agent-avatars'

// Avant :
<span className="text-3xl">{agentConfig.icon}</span>

// Après :
<AgentAvatar type={agentConfig.type as AgentType} size="sm" />
```

Les emojis dans `agents-config.ts` peuvent rester (utilisés comme fallback dans les notifications email, etc.), mais l'affichage UI doit utiliser les avatars SVG.

**Pages concernées pour le remplacement :**
- `src/app/dashboard/page.tsx` → cartes agents (déjà brand mais emoji)
- `src/app/dashboard/agents/page.tsx` → liste agents
- `src/app/dashboard/agents/[agentId]/page.tsx` → détail agent header
- `src/app/admin/page.tsx` → section "Agents les plus utilisés" + actions en attente
- `src/app/admin/agents/page.tsx` → gestion agents
- `src/app/admin/clients/[id]/page.tsx` → agents du client
- Toute autre page affichant `agentConfig.icon`

---

## 6. Principes UX pour artisans

1. **Texte simple** — Pas de jargon : "connecteur" → "liaison avec vos outils", "workflow" → "processus automatisé", "token" → ne pas afficher côté client
2. **Actions claires** — Chaque bouton dit exactement ce qu'il fait
3. **Feedback visuel** — Loading states, success/error messages, transitions douces
4. **Aide contextuelle** — `<HelpTooltip>` sur chaque concept nouveau, `<SectionHelp>` en haut des pages complexes
5. **Pas d'information technique** côté client — Les tokens, logs bruts, JSON sont réservés à l'admin
6. **Navigation catégorisée** — La sidebar utilise déjà des catégories (Principal, Outils, Données, Suivi, Paramètres)

---

## 7. Import à ajouter dans chaque page modifiée

```tsx
// Si utilisation d'avatars
import { AgentAvatar } from '@/components/agents/agent-avatars'

// Si utilisation du header
import { PageHeader } from '@/components/ui/page-header'

// Si état vide
import { EmptyState } from '@/components/ui/empty-state'

// Si aide contextuelle
import { HelpTooltip, SectionHelp } from '@/components/ui/help-tooltip'

// Si stats
import { StatCard } from '@/components/ui/stat-card'

// Type pour les avatars
import type { AgentType } from '@/types/database'
```

---

## 8. Ordre de priorité

1. **Priorité 1** — Remplacement emojis → AgentAvatar (toutes pages)
2. **Priorité 2** — Pages dashboard client (agents, detail, connectors, onboarding, social)
3. **Priorité 3** — Pages admin (dashboard, agents, clients, analytics, billing)
4. **Priorité 4** — Pages secondaires (docs, knowledge, workflows, tasks, settings)

---

## 9. Validation

Après chaque fichier modifié, lancer :
```bash
npx tsc --noEmit
```
pour vérifier qu'il n'y a pas d'erreur TypeScript.

Pour le build complet :
```bash
npm run build
```

---

## 10. Système de Feedback & Auto-amélioration IA

### Architecture
Le système permet à chaque utilisateur de personnaliser le comportement de ses agents IA de manière indépendante. Il se compose de 3 couches :

1. **Détection d'insatisfaction** → `src/components/feedback-assistant.tsx`
2. **Stockage des préférences** → Tables Supabase `client_preferences`, `client_agent_prompts`, `feedback_history`
3. **Injection dans les prompts** → `src/lib/preferences-injector.ts` (appelé depuis `agent-framework.ts`)

### Tables Supabase (migration 015)
```
client_preferences      — Préférences en langage naturel (ton, format, contenu…)
client_agent_prompts    — Prompt personnalisé par agent (mode avancé)
feedback_history        — Historique des feedbacks pour analyse
```

### Composants et fichiers créés — NE PAS RETOUCHER

| Fichier | Rôle |
|---------|------|
| `src/components/feedback-assistant.tsx` | Composant de détection d'insatisfaction + suggestions |
| `src/lib/preferences-injector.ts` | Injection des préférences dans le prompt système |
| `src/app/api/preferences/route.ts` | CRUD préférences utilisateur |
| `src/app/api/preferences/prompts/route.ts` | CRUD prompts personnalisés |
| `src/app/api/feedback/route.ts` | Historique des feedbacks |
| `src/app/dashboard/settings/preferences/page.tsx` | Page de gestion des préférences IA |
| `supabase/migrations/015_user_preferences_memory.sql` | Migration DB |

### Intégration dans le chat
Le `FeedbackAssistant` est intégré dans `agent-detail-client.tsx`. Quand un utilisateur exprime une insatisfaction (détectée via regex sur le message français), le composant propose 3 options :
- **Reformuler** la demande (modifier le prompt et relancer)
- **Mémoriser** une préférence (suggestions automatiques ou texte libre)
- **Personnaliser** les instructions de l'agent (mode avancé)

### Utilisation du composant
```tsx
import { FeedbackAssistant, detectDissatisfaction } from '@/components/feedback-assistant'

// Détecter l'insatisfaction avant d'envoyer
if (detectDissatisfaction(userMessage)) {
  // Afficher le FeedbackAssistant au lieu d'envoyer
}
```

### Page Préférences IA
Accessible depuis la sidebar (catégorie "Paramètres"), la page `/dashboard/settings/preferences` offre :
- **Mode simple** : ajout de préférences en langage naturel par agent ou global
- **Mode avancé** : édition directe du prompt personnalisé par agent
- Toggle switch entre les deux modes

---

## 11. Ne PAS toucher

- `src/app/api/**` — Routes API (backend, pas de UI)
- `src/lib/**` — Logique métier (pas de UI)
- `src/types/database.ts` — Types DB
- `tailwind.config.ts` — Déjà configuré
- `src/app/globals.css` — Déjà configuré
- `src/components/sidebar.tsx` — Déjà migré
- `src/app/login/page.tsx` — Déjà migré
- `src/components/feedback-assistant.tsx` — Déjà créé
- `src/lib/preferences-injector.ts` — Déjà créé
- `src/app/api/preferences/**` — Déjà créé
- `src/app/api/feedback/route.ts` — Déjà créé
- `src/app/dashboard/settings/preferences/page.tsx` — Déjà créé
