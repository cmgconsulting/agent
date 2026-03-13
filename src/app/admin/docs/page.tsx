import { BookOpen, Users, Bot, Link2, Shield, BarChart3, Settings, Zap, ChevronRight } from 'lucide-react'

const sections = [
  {
    id: 'getting-started',
    icon: <Zap className="w-5 h-5 text-blue-600" />,
    title: 'Demarrage rapide',
    content: [
      {
        subtitle: '1. Creer un client',
        text: 'Allez dans Clients > Nouveau client. Remplissez le formulaire avec les informations de l\'entreprise (nom, SIRET, email, plan). A la creation, les 8 agents sont automatiquement provisionnes selon le plan choisi.',
      },
      {
        subtitle: '2. Configurer les connecteurs',
        text: 'Sur la fiche client, cliquez sur "Connecteurs". Activez les integrations necessaires (Gmail, WhatsApp, Pennylane...). Chaque connecteur necessite des identifiants API specifiques qui sont chiffres en AES-256-GCM.',
      },
      {
        subtitle: '3. Activer les agents',
        text: 'Les agents sont actives par defaut selon le plan. Allez dans la fiche agent pour personnaliser les prompts systeme et les instructions specifiques au client.',
      },
      {
        subtitle: '4. Tester',
        text: 'Utilisez le panneau de test sur la page d\'un agent pour envoyer un message et verifier que la reponse est correcte avant la mise en production.',
      },
    ],
  },
  {
    id: 'clients',
    icon: <Users className="w-5 h-5 text-green-600" />,
    title: 'Gestion des clients',
    content: [
      {
        subtitle: 'Plans disponibles',
        text: 'Basic (99 euros/mois, 3 agents) : Eva, Ludo, Marc. Pro (249 euros/mois, 6 agents) : + Leo, Hugo, Sofia. Full (499 euros/mois, 8 agents) : + Felix, Iris.',
      },
      {
        subtitle: 'Onboarding assiste',
        text: 'L\'assistant d\'onboarding (Admin > Onboarding) guide la creation en 5 etapes : infos entreprise, choix du plan, configuration initiale des connecteurs, personnalisation des agents, et validation.',
      },
      {
        subtitle: 'Branding white-label',
        text: 'Chaque client peut avoir son propre branding (couleurs, logo) via Client > Branding. Les couleurs sont appliquees au tableau de bord client automatiquement.',
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
        text: 'Genere et planifie du contenu pour les reseaux sociaux (Facebook, Instagram, LinkedIn). Cree des posts adaptes au secteur ENR avec hashtags et visuels suggeres.',
      },
      {
        subtitle: 'Ludo - SAV & Support',
        text: 'Gere le service apres-vente via WhatsApp et SMS. Repond aux questions clients, cree des tickets, et escalade les cas complexes.',
      },
      {
        subtitle: 'Marc - Email Marketing',
        text: 'Automatise les campagnes email : sequences de nurturing, relances devis, newsletters. Se connecte a Gmail pour l\'envoi.',
      },
      {
        subtitle: 'Leo - Operations',
        text: 'Optimise les operations : planification des interventions, suivi des stocks, generation de devis. Integre Pennylane pour la facturation.',
      },
      {
        subtitle: 'Hugo - Marketing & Leads',
        text: 'Genere et qualifie les leads. Analyse les campagnes marketing, calcule les aides (MaPrimeRenov, CEE), et produit des propositions commerciales.',
      },
      {
        subtitle: 'Sofia - SOP & Process',
        text: 'Cree et maintient les procedures operationnelles standards. Genere des checklists, guides d\'installation, et documentation technique.',
      },
      {
        subtitle: 'Felix - Finance',
        text: 'Suit la tresorerie, genere des rapports financiers, et analyse la rentabilite par client/projet. Integre les donnees Pennylane.',
      },
      {
        subtitle: 'Iris - Reporting & KPIs',
        text: 'Genere des tableaux de bord et rapports automatises. Agregation des KPIs de tous les agents, comparaison mensuelle, alertes sur anomalies.',
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
        text: 'Authentification OAuth2. Permet l\'envoi et la lecture d\'emails. Utilise par Marc (email marketing) et Leo (devis par email).',
      },
      {
        subtitle: 'WhatsApp Business',
        text: 'Via l\'API WhatsApp Business. Necessite un numero de telephone dedie. Utilise par Ludo pour le SAV.',
      },
      {
        subtitle: 'Pennylane',
        text: 'API REST avec cle API. Synchronise les factures, devis, et donnees comptables. Utilise par Leo et Felix.',
      },
      {
        subtitle: 'Make.com (Webhooks)',
        text: 'Integration webhook bidirectionnelle. Permet d\'orchestrer des workflows complexes entre les agents et les outils externes.',
      },
      {
        subtitle: 'Securite des identifiants',
        text: 'Tous les identifiants sont chiffres avec AES-256-GCM avant stockage. La cle de chiffrement est dans les variables d\'environnement serveur uniquement.',
      },
    ],
  },
  {
    id: 'security',
    icon: <Shield className="w-5 h-5 text-red-600" />,
    title: 'Securite',
    content: [
      {
        subtitle: 'Authentification',
        text: 'Supabase Auth avec sessions JWT. Deux roles : admin et client. Le middleware protege toutes les routes selon le role.',
      },
      {
        subtitle: 'Row Level Security (RLS)',
        text: 'Chaque table a des politiques RLS. Les clients ne voient que leurs propres donnees. L\'admin a acces a tout.',
      },
      {
        subtitle: 'Rate Limiting',
        text: 'Limites par endpoint : 20 req/min pour les agents, 60/min pour l\'API, 10/min pour l\'auth, 5/min pour les exports.',
      },
      {
        subtitle: 'Headers de securite',
        text: 'X-Content-Type-Options, X-Frame-Options (DENY), X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS en production.',
      },
      {
        subtitle: 'Validation des entrees',
        text: 'Sanitization HTML/XSS sur toutes les entrees. Validation UUID, email, SIRET sur les parametres. Limite de 5000 caracteres sur les messages.',
      },
    ],
  },
  {
    id: 'monitoring',
    icon: <BarChart3 className="w-5 h-5 text-indigo-600" />,
    title: 'Monitoring & Analytics',
    content: [
      {
        subtitle: 'Logs d\'activite',
        text: 'Tous les appels agent sont logues avec : statut, tokens consommes, duree, cache stats. Accessible dans Admin > Logs avec export CSV.',
      },
      {
        subtitle: 'Health Check',
        text: 'Endpoint /api/health verifie la base de donnees, la cle API Anthropic, et la cle de chiffrement. Retourne healthy/degraded/unhealthy.',
      },
      {
        subtitle: 'Analytics MRR/ARR',
        text: 'Le dashboard analytics calcule le MRR, ARR, nombre de clients par plan, et revenu par agent. Accessible dans Admin > Analytics.',
      },
      {
        subtitle: 'Optimisation des couts',
        text: 'Le prompt caching Anthropic reduit les couts de ~90% sur les appels repetitifs. Les stats de cache sont trackees dans les logs.',
      },
    ],
  },
  {
    id: 'deployment',
    icon: <Settings className="w-5 h-5 text-gray-600" />,
    title: 'Deploiement',
    content: [
      {
        subtitle: 'Vercel',
        text: 'Deploiement sur Vercel, region cdg1 (Paris). Configuration dans vercel.json : timeouts adaptes par route, headers de securite, cache optimise.',
      },
      {
        subtitle: 'Variables d\'environnement',
        text: 'Voir .env.example pour la liste complete. Les variables critiques : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ENCRYPTION_KEY.',
      },
      {
        subtitle: 'Mise a jour',
        text: 'Push sur la branche main pour deployer automatiquement. Vercel gere le build et le deploiement zero-downtime.',
      },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Documentation
        </h1>
        <p className="text-gray-500 mt-1">Guide complet d&apos;utilisation de CMG Agents</p>
      </div>

      {/* Table of contents */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Sommaire</h2>
        <nav className="space-y-1">
          {sections.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-gray-700 hover:text-gray-900"
            >
              {section.icon}
              <span className="font-medium">{section.title}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
          ))}
        </nav>
      </div>

      {/* Content sections */}
      <div className="space-y-8">
        {sections.map(section => (
          <div key={section.id} id={section.id} className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              {section.icon}
              {section.title}
            </h2>
            <div className="space-y-5">
              {section.content.map((item, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-gray-800 mb-1">{item.subtitle}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
