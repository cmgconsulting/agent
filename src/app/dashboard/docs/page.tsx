import { BookOpen, Bot, Plug, MessageSquare, HelpCircle, ChevronRight } from 'lucide-react'
import { RestartTourButton } from '@/components/ui/restart-tour-button'

const sections = [
  {
    id: 'welcome',
    icon: <BookOpen className="w-5 h-5 text-brand-500" />,
    title: 'Bienvenue',
    content: [
      {
        subtitle: 'Qu\'est-ce que CMG Agents ?',
        text: 'CMG Agents est votre plateforme d\'intelligence artificielle dédiée au secteur des énergies renouvelables. Nos agents IA travaillent 24h/24 pour automatiser vos tâches : marketing, SAV, emails, opérations, et plus encore.',
      },
      {
        subtitle: 'Comment ça marche ?',
        text: 'Chaque agent est spécialisé dans un domaine. Vous interagissez avec eux depuis votre tableau de bord. Ils utilisent vos connecteurs (Gmail, WhatsApp...) pour agir directement dans vos outils.',
      },
      {
        subtitle: 'Votre plan',
        text: 'Le nombre d\'agents disponibles dépend de votre plan. Starter : 3 agents. Pro : 8 agents. Enterprise : agents illimités. Contactez votre administrateur pour changer de plan.',
      },
    ],
  },
  {
    id: 'agents',
    icon: <Bot className="w-5 h-5 text-purple-600" />,
    title: 'Utiliser vos agents',
    content: [
      {
        subtitle: 'Accéder à un agent',
        text: 'Cliquez sur "Mes Agents" dans le menu. Sélectionnez l\'agent que vous souhaitez utiliser. Vous verrez sa description, son statut, et ses dernières actions.',
      },
      {
        subtitle: 'Envoyer un message',
        text: 'Sur la page d\'un agent, utilisez la zone de texte pour envoyer votre demande. Soyez précis dans vos instructions. L\'agent traitera votre demande et vous montrera le résultat.',
      },
      {
        subtitle: 'Actions en attente',
        text: 'Certaines actions nécessitent votre approbation (ex: envoi d\'email, publication sur les réseaux). Vous recevrez une notification et pourrez approuver ou refuser.',
      },
      {
        subtitle: 'Historique',
        text: 'Chaque agent garde un historique de ses actions. Vous pouvez consulter les logs pour voir ce qui a été fait, les tokens consommés, et les éventuelles erreurs.',
      },
    ],
  },
  {
    id: 'connectors',
    icon: <Plug className="w-5 h-5 text-orange-600" />,
    title: 'Connecteurs',
    content: [
      {
        subtitle: 'Qu\'est-ce qu\'un connecteur ?',
        text: 'Les connecteurs permettent à vos agents d\'interagir avec vos outils : Gmail pour les emails, WhatsApp pour le SAV, Pennylane pour la comptabilité, etc.',
      },
      {
        subtitle: 'État des connecteurs',
        text: 'Allez dans "Connecteurs" pour voir l\'état de chaque intégration. Un point vert signifie que le connecteur est actif et fonctionnel.',
      },
      {
        subtitle: 'Problème de connexion ?',
        text: 'Si un connecteur affiche une erreur, contactez votre administrateur CMG. Il pourra revérifier les identifiants et relancer la connexion.',
      },
    ],
  },
  {
    id: 'tips',
    icon: <MessageSquare className="w-5 h-5 text-emerald-600" />,
    title: 'Conseils d\'utilisation',
    content: [
      {
        subtitle: 'Soyez spécifique',
        text: 'Plus votre demande est précise, meilleur sera le résultat. Par exemple, au lieu de "fais un post", dites "crée un post LinkedIn sur les avantages des poêles à bois avec des statistiques 2024".',
      },
      {
        subtitle: 'Vérifiez avant publication',
        text: 'Relisez toujours les contenus générés avant de les publier. Les agents sont puissants mais peuvent parfois nécessiter des ajustements.',
      },
      {
        subtitle: 'Utilisez les KPIs',
        text: 'Consultez régulièrement vos KPIs pour suivre l\'efficacité des agents. Les métriques vous aident à ajuster votre utilisation.',
      },
    ],
  },
  {
    id: 'faq',
    icon: <HelpCircle className="w-5 h-5 text-indigo-600" />,
    title: 'Questions fréquentes',
    content: [
      {
        subtitle: 'Puis-je annuler une action d\'un agent ?',
        text: 'Les actions en attente d\'approbation peuvent être refusées. Les actions déjà exécutées (emails envoyés, etc.) ne peuvent pas être annulées.',
      },
      {
        subtitle: 'Mes données sont-elles sécurisées ?',
        text: 'Oui. Tous les identifiants sont chiffrés. L\'accès aux données est contrôlé par des politiques de sécurité strictes. Vous ne voyez que vos propres données.',
      },
      {
        subtitle: 'Comment changer de plan ?',
        text: 'Contactez votre administrateur CMG pour discuter d\'un changement de plan. Le passage à un plan supérieur active immédiatement les agents supplémentaires.',
      },
      {
        subtitle: 'Un agent ne répond pas, que faire ?',
        text: 'Vérifiez que l\'agent est bien actif (statut vert). Si le problème persiste, consultez la page Connecteurs pour vérifier que les intégrations sont fonctionnelles, puis contactez votre administrateur.',
      },
    ],
  },
]

export default function ClientDocsPage() {
  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-700 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-500" />
          Guide d&apos;utilisation
        </h1>
        <p className="text-ink-400 mt-1">Tout ce que vous devez savoir pour utiliser CMG Agents</p>
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

      {/* Restart tour */}
      <div className="mt-8 card flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink-700 mb-1">Guide interactif</h3>
          <p className="text-ink-400 text-sm">Relancez le tour guide pour redecouvrir la plateforme.</p>
        </div>
        <RestartTourButton />
      </div>

      {/* Contact support */}
      <div className="mt-4 bg-brand-50 rounded-2xl p-6 text-center">
        <h3 className="font-semibold text-brand-700 mb-2">Besoin d&apos;aide ?</h3>
        <p className="text-brand-600 text-sm">
          Contactez votre administrateur CMG Consulting pour toute question ou assistance technique.
        </p>
      </div>
    </div>
  )
}
