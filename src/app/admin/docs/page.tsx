import { BookOpen, Users, Bot, Link2, Shield, BarChart3, Settings, Zap, ChevronRight } from 'lucide-react'

const sections = [
  {
    id: 'getting-started',
    icon: <Zap className="w-5 h-5 text-brand-500" />,
    title: 'Démarrage rapide',
    content: [
      {
        subtitle: '1. Créer un client',
        text: 'Allez dans Clients > Nouveau client. Remplissez le formulaire avec les informations de l\'entreprise (nom, SIRET, email, plan). À la création, les 8 agents sont automatiquement provisionnés selon le plan choisi.',
      },
      {
        subtitle: '2. Configurer les connecteurs',
        text: 'Sur la fiche client, cliquez sur "Connecteurs". Activez les intégrations nécessaires (Gmail, WhatsApp, Pennylane...). Chaque connecteur nécessite des identifiants API spécifiques qui sont chiffrés en AES-256-GCM.',
      },
      {
        subtitle: '3. Activer les agents',
        text: 'Les agents sont activés par défaut selon le plan. Allez dans la fiche agent pour personnaliser les prompts système et les instructions spécifiques au client.',
      },
      {
        subtitle: '4. Tester',
        text: 'Utilisez le panneau de test sur la page d\'un agent pour envoyer un message et vérifier que la réponse est correcte avant la mise en production.',
      },
    ],
  },
  {
    id: 'clients',
    icon: <Users className="w-5 h-5 text-emerald-600" />,
    title: 'Gestion des clients',
    content: [
      {
        subtitle: 'Plans disponibles',
        text: 'Starter (29 euros/mois, 3 agents) : Eva, Ludo, Marc. Pro (79 euros/mois, 8 agents) : tous les agents. Enterprise (199 euros/mois) : agents illimités + support prioritaire.',
      },
      {
        subtitle: 'Onboarding assisté',
        text: 'L\'assistant d\'onboarding (Admin > Onboarding) guide la création en 5 étapes : infos entreprise, choix du plan, configuration initiale des connecteurs, personnalisation des agents, et validation.',
      },
      {
        subtitle: 'Branding white-label',
        text: 'Chaque client peut avoir son propre branding (couleurs, logo) via Client > Branding. Les couleurs sont appliquées au tableau de bord client automatiquement.',
      },
    ],
  },
  {
    id: 'agents',
    icon: <Bot className="w-5 h-5 text-purple-600" />,
    title: 'Les 8 agents IA',
    content: [
      {
        subtitle: 'Eva - Social Media Manager',
        text: 'Génère et planifie du contenu pour les réseaux sociaux (Facebook, Instagram, LinkedIn). Crée des posts adaptés au secteur ENR avec hashtags et visuels suggérés.',
      },
      {
        subtitle: 'Ludo - SAV & Support',
        text: 'Gère le service après-vente via WhatsApp et SMS. Répond aux questions clients, crée des tickets, et escalade les cas complexes.',
      },
      {
        subtitle: 'Marc - Email Marketing',
        text: 'Automatise les campagnes email : séquences de nurturing, relances devis, newsletters. Se connecte à Gmail pour l\'envoi.',
      },
      {
        subtitle: 'Léo - Opérations',
        text: 'Optimise les opérations : planification des interventions, suivi des stocks, génération de devis. Intègre Pennylane pour la facturation.',
      },
      {
        subtitle: 'Hugo - Marketing & Leads',
        text: 'Génère et qualifie les leads. Analyse les campagnes marketing, calcule les aides (MaPrimeRénov, CEE), et produit des propositions commerciales.',
      },
      {
        subtitle: 'Sofia - SOP & Process',
        text: 'Crée et maintient les procédures opérationnelles standards. Génère des checklists, guides d\'installation, et documentation technique.',
      },
      {
        subtitle: 'Félix - Finance',
        text: 'Suit la trésorerie, génère des rapports financiers, et analyse la rentabilité par client/projet. Intègre les données Pennylane.',
      },
      {
        subtitle: 'Iris - Reporting & KPIs',
        text: 'Génère des tableaux de bord et rapports automatisés. Agrégation des KPIs de tous les agents, comparaison mensuelle, alertes sur anomalies.',
      },
    ],
  },
  {
    id: 'connectors',
    icon: <Link2 className="w-5 h-5 text-orange-600" />,
    title: 'Connecteurs',
    content: [
      {
        subtitle: 'Gmail',
        text: 'Authentification OAuth2. Permet l\'envoi et la lecture d\'emails. Utilisé par Marc (email marketing) et Léo (devis par email).',
      },
      {
        subtitle: 'WhatsApp Business',
        text: 'Via l\'API WhatsApp Business. Nécessite un numéro de téléphone dédié. Utilisé par Ludo pour le SAV.',
      },
      {
        subtitle: 'Pennylane',
        text: 'API REST avec clé API. Synchronise les factures, devis, et données comptables. Utilisé par Léo et Félix.',
      },
      {
        subtitle: 'Make.com (Webhooks)',
        text: 'Intégration webhook bidirectionnelle. Permet d\'orchestrer des workflows complexes entre les agents et les outils externes.',
      },
      {
        subtitle: 'Sécurité des identifiants',
        text: 'Tous les identifiants sont chiffrés avec AES-256-GCM avant stockage. La clé de chiffrement est dans les variables d\'environnement serveur uniquement.',
      },
    ],
  },
  {
    id: 'security',
    icon: <Shield className="w-5 h-5 text-red-600" />,
    title: 'Sécurité',
    content: [
      {
        subtitle: 'Authentification',
        text: 'Supabase Auth avec sessions JWT. Deux rôles : admin et client. Le middleware protège toutes les routes selon le rôle.',
      },
      {
        subtitle: 'Row Level Security (RLS)',
        text: 'Chaque table a des politiques RLS. Les clients ne voient que leurs propres données. L\'admin a accès à tout.',
      },
      {
        subtitle: 'Rate Limiting',
        text: 'Limites par endpoint : 20 req/min pour les agents, 60/min pour l\'API, 10/min pour l\'auth, 5/min pour les exports.',
      },
      {
        subtitle: 'Headers de sécurité',
        text: 'X-Content-Type-Options, X-Frame-Options (DENY), X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS en production.',
      },
      {
        subtitle: 'Validation des entrées',
        text: 'Sanitization HTML/XSS sur toutes les entrées. Validation UUID, email, SIRET sur les paramètres. Limite de 5000 caractères sur les messages.',
      },
    ],
  },
  {
    id: 'monitoring',
    icon: <BarChart3 className="w-5 h-5 text-indigo-600" />,
    title: 'Monitoring & Analytics',
    content: [
      {
        subtitle: 'Logs d\'activité',
        text: 'Tous les appels agent sont logués avec : statut, tokens consommés, durée, cache stats. Accessible dans Admin > Logs avec export CSV.',
      },
      {
        subtitle: 'Health Check',
        text: 'Endpoint /api/health vérifie la base de données, la clé API Anthropic, et la clé de chiffrement. Retourne healthy/degraded/unhealthy.',
      },
      {
        subtitle: 'Analytics MRR/ARR',
        text: 'Le dashboard analytics calcule le MRR, ARR, nombre de clients par plan, et revenu par agent. Accessible dans Admin > Analytics.',
      },
      {
        subtitle: 'Optimisation des coûts',
        text: 'Le prompt caching Anthropic réduit les coûts de ~90% sur les appels répétitifs. Les stats de cache sont trackées dans les logs.',
      },
    ],
  },
  {
    id: 'deployment',
    icon: <Settings className="w-5 h-5 text-ink-500" />,
    title: 'Déploiement',
    content: [
      {
        subtitle: 'Vercel',
        text: 'Déploiement sur Vercel, région cdg1 (Paris). Configuration dans vercel.json : timeouts adaptés par route, headers de sécurité, cache optimisé.',
      },
      {
        subtitle: 'Variables d\'environnement',
        text: 'Voir .env.example pour la liste complète. Les variables critiques : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ENCRYPTION_KEY.',
      },
      {
        subtitle: 'Mise à jour',
        text: 'Push sur la branche main pour déployer automatiquement. Vercel gère le build et le déploiement zero-downtime.',
      },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-700 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-500" />
          Documentation
        </h1>
        <p className="text-ink-400 mt-1">Guide complet d&apos;utilisation de CMG Agents</p>
      </div>

      {/* Table of contents */}
      <div className="card mb-8">
        <h2 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-4">Sommaire</h2>
        <nav className="space-y-1">
          {sections.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-50 transition-colors text-ink-600 hover:text-ink-700"
            >
              {section.icon}
              <span className="font-medium">{section.title}</span>
              <ChevronRight className="w-4 h-4 text-ink-300 ml-auto" />
            </a>
          ))}
        </nav>
      </div>

      {/* Content sections */}
      <div className="space-y-8">
        {sections.map(section => (
          <div key={section.id} id={section.id} className="card">
            <h2 className="text-lg font-bold text-ink-700 flex items-center gap-2 mb-6">
              {section.icon}
              {section.title}
            </h2>
            <div className="space-y-5">
              {section.content.map((item, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-ink-600 mb-1">{item.subtitle}</h3>
                  <p className="text-ink-500 text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
