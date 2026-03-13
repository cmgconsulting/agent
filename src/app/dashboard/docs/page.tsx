import { BookOpen, Bot, Plug, MessageSquare, HelpCircle, ChevronRight } from 'lucide-react'

const sections = [
  {
    id: 'welcome',
    icon: <BookOpen className="w-5 h-5 text-blue-600" />,
    title: 'Bienvenue',
    content: [
      {
        subtitle: 'Qu\'est-ce que CMG Agents ?',
        text: 'CMG Agents est votre plateforme d\'intelligence artificielle dediee au secteur des energies renouvelables. Nos agents IA travaillent 24h/24 pour automatiser vos taches : marketing, SAV, emails, operations, et plus encore.',
      },
      {
        subtitle: 'Comment ca marche ?',
        text: 'Chaque agent est specialise dans un domaine. Vous interagissez avec eux depuis votre tableau de bord. Ils utilisent vos connecteurs (Gmail, WhatsApp...) pour agir directement dans vos outils.',
      },
      {
        subtitle: 'Votre plan',
        text: 'Le nombre d\'agents disponibles depend de votre plan. Basic : 3 agents. Pro : 6 agents. Full : 8 agents. Contactez votre administrateur pour changer de plan.',
      },
    ],
  },
  {
    id: 'agents',
    icon: <Bot className="w-5 h-5 text-purple-600" />,
    title: 'Utiliser vos agents',
    content: [
      {
        subtitle: 'Acceder a un agent',
        text: 'Cliquez sur "Mes Agents" dans le menu. Selectionnez l\'agent que vous souhaitez utiliser. Vous verrez sa description, son statut, et ses dernieres actions.',
      },
      {
        subtitle: 'Envoyer un message',
        text: 'Sur la page d\'un agent, utilisez la zone de texte pour envoyer votre demande. Soyez precis dans vos instructions. L\'agent traitera votre demande et vous montrera le resultat.',
      },
      {
        subtitle: 'Actions en attente',
        text: 'Certaines actions necessitent votre approbation (ex: envoi d\'email, publication sur les reseaux). Vous recevrez une notification et pourrez approuver ou refuser.',
      },
      {
        subtitle: 'Historique',
        text: 'Chaque agent garde un historique de ses actions. Vous pouvez consulter les logs pour voir ce qui a ete fait, les tokens consommes, et les eventuels erreurs.',
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
        text: 'Les connecteurs permettent a vos agents d\'interagir avec vos outils : Gmail pour les emails, WhatsApp pour le SAV, Pennylane pour la comptabilite, etc.',
      },
      {
        subtitle: 'Etat des connecteurs',
        text: 'Allez dans "Connecteurs" pour voir l\'etat de chaque integration. Un point vert signifie que le connecteur est actif et fonctionnel.',
      },
      {
        subtitle: 'Probleme de connexion ?',
        text: 'Si un connecteur affiche une erreur, contactez votre administrateur CMG. Il pourra reverifier les identifiants et relancer la connexion.',
      },
    ],
  },
  {
    id: 'tips',
    icon: <MessageSquare className="w-5 h-5 text-green-600" />,
    title: 'Conseils d\'utilisation',
    content: [
      {
        subtitle: 'Soyez specifique',
        text: 'Plus votre demande est precise, meilleur sera le resultat. Par exemple, au lieu de "fais un post", dites "cree un post LinkedIn sur les avantages des poeles a bois avec des statistiques 2024".',
      },
      {
        subtitle: 'Verifiez avant publication',
        text: 'Relisez toujours les contenus generes avant de les publier. Les agents sont puissants mais peuvent parfois necesiter des ajustements.',
      },
      {
        subtitle: 'Utilisez les KPIs',
        text: 'Consultez regulierement vos KPIs pour suivre l\'efficacite des agents. Les metrics vous aident a ajuster votre utilisation.',
      },
    ],
  },
  {
    id: 'faq',
    icon: <HelpCircle className="w-5 h-5 text-indigo-600" />,
    title: 'Questions frequentes',
    content: [
      {
        subtitle: 'Puis-je annuler une action d\'un agent ?',
        text: 'Les actions en attente d\'approbation peuvent etre refusees. Les actions deja executees (emails envoyes, etc.) ne peuvent pas etre annulees.',
      },
      {
        subtitle: 'Mes donnees sont-elles securisees ?',
        text: 'Oui. Tous les identifiants sont chiffres. L\'acces aux donnees est controle par des politiques de securite strictes. Vous ne voyez que vos propres donnees.',
      },
      {
        subtitle: 'Comment changer de plan ?',
        text: 'Contactez votre administrateur CMG pour discuter d\'un changement de plan. Le passage a un plan superieur active immediatement les agents supplementaires.',
      },
      {
        subtitle: 'Un agent ne repond pas, que faire ?',
        text: 'Verifiez que l\'agent est bien actif (statut vert). Si le probleme persiste, consultez la page Connecteurs pour verifier que les integrations sont fonctionnelles, puis contactez votre administrateur.',
      },
    ],
  },
]

export default function ClientDocsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Guide d&apos;utilisation
        </h1>
        <p className="text-gray-500 mt-1">Tout ce que vous devez savoir pour utiliser CMG Agents</p>
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

      {/* Contact support */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6 text-center">
        <h3 className="font-semibold text-blue-900 mb-2">Besoin d&apos;aide ?</h3>
        <p className="text-blue-700 text-sm">
          Contactez votre administrateur CMG Consulting pour toute question ou assistance technique.
        </p>
      </div>
    </div>
  )
}
