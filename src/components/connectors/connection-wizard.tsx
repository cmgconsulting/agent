'use client'

import { useState } from 'react'
import { X, CheckCircle, ArrowRight, ArrowLeft, ExternalLink, RefreshCw, AlertTriangle, Zap, Key, ShieldCheck } from 'lucide-react'
import type { ConnectorType } from '@/types/database'
import type { ConnectorConfig } from '@/lib/connectors-config'

// ===== Connector descriptions in plain French for artisans =====

const CONNECTOR_INFO: Partial<Record<ConnectorType, {
  description: string
  agentName: string
  benefits: string[]
  apiKeyInstructions?: string[]
}>> = {
  gmail: {
    description: 'Connectez votre boite email pour que Marc puisse lire et repondre a vos emails professionnels automatiquement.',
    agentName: 'Marc',
    benefits: ['Tri automatique de vos emails (devis, SAV, leads)', 'Reponses automatiques aux demandes courantes', 'Aucun email important oublie'],
  },
  outlook: {
    description: 'Connectez votre boite Outlook pour que Marc gere vos emails professionnels.',
    agentName: 'Marc',
    benefits: ['Tri automatique par categorie', 'Reponses rapides aux demandes', 'Suivi des conversations clients'],
  },
  brevo: {
    description: 'Connectez Brevo pour envoyer des newsletters et des emails marketing a vos clients.',
    agentName: 'Marc',
    benefits: ['Campagnes email automatisees', 'Relances clients intelligentes', 'Suivi des ouvertures et clics'],
    apiKeyInstructions: [
      'Allez sur app.brevo.com et connectez-vous',
      'Cliquez sur votre nom en haut a droite, puis "SMTP & API"',
      'Dans l\'onglet "API Keys", cliquez "Generate a new API key"',
      'Donnez un nom (ex: "CMG Agents") et copiez la cle generee',
    ],
  },
  mailchimp: {
    description: 'Connectez Mailchimp pour gerer vos listes de contacts et newsletters.',
    agentName: 'Marc',
    benefits: ['Synchronisation de vos contacts', 'Envoi de newsletters automatiques', 'Segmentation de votre audience'],
    apiKeyInstructions: [
      'Allez sur mailchimp.com et connectez-vous',
      'Cliquez sur votre profil, puis "Account & billing"',
      'Allez dans "Extras" puis "API keys"',
      'Cliquez "Create A Key" et copiez la cle',
      'Le prefixe serveur est la partie apres le tiret (ex: us21)',
    ],
  },
  meta_api: {
    description: 'Connectez Facebook et Instagram pour que Eva publie et gere vos reseaux sociaux.',
    agentName: 'Eva',
    benefits: ['Publications automatiques sur Facebook et Instagram', 'Reponses aux commentaires', 'Suivi de l\'engagement'],
  },
  linkedin_api: {
    description: 'Connectez LinkedIn pour que Eva gere votre page entreprise et publie du contenu professionnel.',
    agentName: 'Eva',
    benefits: ['Posts LinkedIn automatiques', 'Suivi des abonnes et de l\'engagement', 'Analyse des performances'],
  },
  meta_ads: {
    description: 'Connectez Meta Ads pour que Hugo surveille vos campagnes publicitaires Facebook et Instagram.',
    agentName: 'Hugo',
    benefits: ['Suivi en temps reel de vos depenses pub', 'Alertes si une campagne performe mal', 'Rapports de performance automatiques'],
    apiKeyInstructions: [
      'Allez sur business.facebook.com',
      'Allez dans "Parametres" puis "Parametres de l\'entreprise"',
      'Selectionnez "Tokens d\'acces systeme"',
      'Creez un token avec les permissions ads_read',
      'Votre Ad Account ID se trouve dans "Comptes publicitaires" (format: act_xxxxx)',
    ],
  },
  google_ads: {
    description: 'Connectez Google Ads pour que Hugo suive et optimise vos campagnes Google.',
    agentName: 'Hugo',
    benefits: ['Suivi des performances de vos campagnes', 'Alertes budget et CPC', 'Rapports detailles par campagne'],
  },
  google_analytics: {
    description: 'Connectez Google Analytics pour que Iris analyse le trafic de votre site web.',
    agentName: 'Iris',
    benefits: ['Combien de visiteurs sur votre site', 'D\'ou viennent vos visiteurs', 'Quelles pages sont les plus consultees'],
  },
  airtable: {
    description: 'Connectez Airtable pour centraliser vos donnees clients, devis et interventions.',
    agentName: 'Sofia',
    benefits: ['Synchronisation de vos bases de donnees', 'Suivi des interventions et devis', 'Tableaux de bord automatiques'],
    apiKeyInstructions: [
      'Allez sur airtable.com et connectez-vous',
      'Cliquez sur votre avatar en haut a droite',
      'Selectionnez "Developer hub"',
      'Cliquez "Create new token"',
      'Donnez un nom et selectionnez les bases a partager',
      'Copiez le token genere (commence par "pat...")',
    ],
  },
  hubspot: {
    description: 'Connectez HubSpot pour synchroniser vos contacts et suivre votre pipeline commercial.',
    agentName: 'Hugo',
    benefits: ['Suivi de vos prospects et clients', 'Pipeline de vente automatise', 'Historique des echanges clients'],
    apiKeyInstructions: [
      'Allez sur app.hubspot.com et connectez-vous',
      'Cliquez sur "Parametres" (icone engrenage)',
      'Allez dans "Integrations" puis "Private apps"',
      'Cliquez "Create a private app"',
      'Donnez un nom et selectionnez les scopes necessaires',
      'Copiez l\'Access Token genere',
    ],
  },
  notion: {
    description: 'Connectez Notion pour que Sofia organise vos documents et procedures.',
    agentName: 'Sofia',
    benefits: ['Organisation automatique de vos docs', 'Creation de procedures (SOP)', 'Partage d\'informations entre agents'],
    apiKeyInstructions: [
      'Allez sur notion.so/my-integrations',
      'Cliquez "New integration"',
      'Donnez un nom (ex: "CMG Agents")',
      'Copiez le "Internal Integration Token" (commence par "secret_...")',
      'Dans Notion, partagez les pages souhaitees avec votre integration',
    ],
  },
  google_docs: {
    description: 'Connectez Google Docs pour que Sofia cree et organise vos documents.',
    agentName: 'Sofia',
    benefits: ['Creation automatique de documents', 'Organisation de votre Drive', 'Modeles de documents personnalises'],
  },
  pennylane: {
    description: 'Connectez Pennylane pour que Felix suive votre comptabilite et vos marges en temps reel.',
    agentName: 'Felix',
    benefits: ['Suivi de votre tresorerie', 'Alertes sur les factures impayees', 'Rapports financiers automatiques'],
    apiKeyInstructions: [
      'Connectez-vous a app.pennylane.com',
      'Allez dans "Parametres" puis "API"',
      'Generez une nouvelle cle API',
      'Copiez la cle et collez-la ci-dessous',
    ],
  },
  sellsy: {
    description: 'Connectez Sellsy pour synchroniser votre CRM et votre facturation.',
    agentName: 'Felix',
    benefits: ['Suivi des devis et factures', 'Synchronisation des contacts', 'Relances automatiques'],
    apiKeyInstructions: [
      'Allez sur app.sellsy.com et connectez-vous',
      'Allez dans "Parametres" puis "Developpeurs"',
      'Creez une nouvelle application',
      'Copiez le Client ID et le Client Secret',
    ],
  },
  quickbooks: {
    description: 'Connectez QuickBooks pour que Felix suive vos finances et votre comptabilite.',
    agentName: 'Felix',
    benefits: ['Import automatique des transactions', 'Suivi des depenses et revenus', 'Rapports de tresorerie'],
  },
  google_sheets: {
    description: 'Connectez Google Sheets pour synchroniser vos tableaux de suivi avec vos agents.',
    agentName: 'Felix',
    benefits: ['Import/export de donnees', 'Tableaux de bord en temps reel', 'Partage facilite avec votre equipe'],
  },
  canva: {
    description: 'Connectez Canva pour que Eva cree des visuels pour vos reseaux sociaux.',
    agentName: 'Eva',
    benefits: ['Creation de visuels automatiques', 'Templates personnalises a vos couleurs', 'Visuels pour posts et stories'],
    apiKeyInstructions: [
      'Allez sur canva.com/developers',
      'Creez une application',
      'Generez une cle API',
      'Copiez la cle et collez-la ci-dessous',
    ],
  },
  whatsapp: {
    description: 'Connectez WhatsApp Business pour que Ludo reponde automatiquement a vos clients par message.',
    agentName: 'Ludo',
    benefits: ['Reponses automatiques aux messages clients', 'Support client 24h/24', 'Envoi de confirmations de RDV'],
    apiKeyInstructions: [
      'Allez sur developers.facebook.com',
      'Selectionnez votre application WhatsApp Business',
      'Allez dans "WhatsApp" puis "Configuration"',
      'Copiez le Phone Number ID et le Access Token',
      'Definissez un Verify Token pour le webhook',
    ],
  },
  twilio: {
    description: 'Connectez Twilio pour envoyer des SMS automatiques a vos clients (confirmations, rappels).',
    agentName: 'Ludo',
    benefits: ['SMS de confirmation automatiques', 'Rappels de rendez-vous', 'Alertes et notifications clients'],
    apiKeyInstructions: [
      'Allez sur console.twilio.com',
      'Sur le tableau de bord, copiez votre Account SID',
      'Cliquez sur "Show" a cote du Auth Token et copiez-le',
      'Votre numero Twilio est visible dans "Phone Numbers"',
    ],
  },
  make_com: {
    description: 'Connectez Make.com pour creer des automatisations avancees entre tous vos outils.',
    agentName: 'Leo',
    benefits: ['Automatisations sur mesure', 'Connexion entre tous vos outils', 'Scenarios complexes sans code'],
    apiKeyInstructions: [
      'Allez sur make.com et ouvrez votre scenario',
      'Ajoutez un module "Webhooks"',
      'Selectionnez "Custom webhook"',
      'Copiez l\'URL du webhook generee',
    ],
  },
}

// ===== Component =====

interface ConnectionWizardProps {
  connector: ConnectorConfig
  currentStatus?: 'active' | 'inactive' | 'error'
  onSuccess: () => void
  onClose: () => void
}

export function ConnectionWizard({ connector, onSuccess, onClose }: ConnectionWizardProps) {
  const [step, setStep] = useState(1)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const info = CONNECTOR_INFO[connector.type]
  const isOAuth = connector.authMethod === 'oauth2' && connector.fields.length === 0
  const totalSteps = isOAuth ? 2 : 3

  function handleFieldChange(key: string, value: string) {
    setCredentials(prev => ({ ...prev, [key]: value }))
    setTestError(null)
  }

  async function handleSaveApiKey() {
    setSaving(true)
    setTestError(null)
    try {
      const res = await fetch('/api/connectors/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_type: connector.type,
          credentials,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      setStep(totalSteps)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestError(null)
    try {
      const res = await fetch('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_type: connector.type }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Le test a echoue')
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Erreur de test')
    } finally {
      setTesting(false)
    }
  }

  function handleOAuthStart() {
    // Redirect to OAuth flow
    window.location.href = `/api/connectors/${connector.type.replace(/_/g, '-')}/connect`
  }

  const allFieldsFilled = connector.fields
    .filter(f => f.required)
    .every(f => credentials[f.key]?.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{connector.icon}</span>
            <div>
              <h2 className="font-bold text-ink-700">{connector.label}</h2>
              <p className="text-xs text-ink-300">
                {info?.agentName ? `Utilise par ${info.agentName}` : connector.category}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-ink-300 hover:bg-surface-100 hover:text-ink-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 mb-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-brand-400' : 'bg-surface-200'
                }`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-300 text-right">Etape {step}/{totalSteps}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* ===== STEP 1: Explanation ===== */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-brand-50 rounded-2xl p-4">
                <p className="text-sm text-ink-600 leading-relaxed">
                  {info?.description || `Connectez ${connector.label} a vos agents IA.`}
                </p>
              </div>

              {info?.benefits && (
                <div>
                  <p className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-2">Ce que ca vous apporte</p>
                  <ul className="space-y-2">
                    {info.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-ink-300 bg-surface-50 rounded-xl p-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Vos identifiants sont chiffres (AES-256) et ne sont jamais partages.
              </div>

              <button onClick={() => setStep(2)} className="btn-brand w-full flex items-center justify-center gap-2">
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ===== STEP 2: OAuth flow OR API key entry ===== */}
          {step === 2 && isOAuth && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-brand-500" />
                </div>
                <h3 className="font-semibold text-ink-700 mb-2">Autoriser l&apos;acces</h3>
                <p className="text-sm text-ink-400">
                  Vous allez etre redirige vers {connector.label} pour autoriser l&apos;acces securise.
                  Aucun mot de passe ne sera partage.
                </p>
              </div>

              {/* Extra fields for OAuth connectors that need them (e.g. google_analytics property_id) */}
              {connector.fields.length > 0 && (
                <div className="space-y-3">
                  {connector.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-ink-600 mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        value={credentials[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="input w-full"
                      />
                      {field.helpText && (
                        <p className="text-xs text-ink-300 mt-1">{field.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleOAuthStart} className="btn-brand w-full flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Autoriser {connector.label}
              </button>

              <button onClick={() => setStep(1)} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </div>
          )}

          {step === 2 && !isOAuth && (
            <div className="space-y-4">
              {/* API key instructions */}
              {info?.apiKeyInstructions && (
                <div className="bg-surface-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Ou trouver vos identifiants
                  </p>
                  <ol className="space-y-2">
                    {info.apiKeyInstructions.map((instruction, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink-600">
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-3">
                {connector.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-ink-600 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={credentials[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input w-full"
                    />
                    {field.helpText && (
                      <p className="text-xs text-ink-300 mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>

              {testError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {testError}
                </div>
              )}

              <button
                onClick={handleSaveApiKey}
                disabled={!allFieldsFilled || saving}
                className="btn-brand w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {saving ? 'Connexion en cours...' : 'Connecter'}
              </button>

              <button onClick={() => setStep(1)} className="btn-ghost w-full flex items-center justify-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </div>
          )}

          {/* ===== FINAL STEP: Success ===== */}
          {step === totalSteps && step > 1 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto animate-bounce-soft">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-700">{connector.label} est connecte !</h3>
                <p className="text-sm text-ink-400 mt-1">
                  {info?.agentName
                    ? `${info.agentName} peut maintenant utiliser ${connector.label} pour vous aider.`
                    : `Votre connexion ${connector.label} est active.`
                  }
                </p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {testing ? 'Test en cours...' : 'Tester la connexion'}
              </button>

              {testError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {testError}
                </div>
              )}

              <button
                onClick={() => { onSuccess(); onClose() }}
                className="btn-brand w-full"
              >
                Terminer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
