'use client'

import { useState } from 'react'
import { X, CheckCircle, ExternalLink, AlertTriangle, Zap, Key, ShieldCheck, Loader2 } from 'lucide-react'
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

export function ConnectionWizard({ connector, currentStatus, onSuccess, onClose }: ConnectionWizardProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState<string | null>(null)
  const [connected, setConnected] = useState(currentStatus === 'active')
  const [testing, setTesting] = useState(false)

  const info = CONNECTOR_INFO[connector.type]
  const isOAuth = connector.authMethod === 'oauth2' && connector.fields.length === 0
  const hasExtraOAuthFields = connector.authMethod === 'oauth2' && connector.fields.length > 0

  function handleFieldChange(key: string, value: string) {
    setCredentials(prev => ({ ...prev, [key]: value }))
    setTestError(null)
    setTestSuccess(null)
  }

  async function handleSaveApiKey() {
    setSaving(true)
    setTestError(null)
    setTestSuccess(null)
    try {
      const res = await fetch('/api/connectors/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_type: connector.type,
          credentials,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      // The save route auto-tests
      if (data.test_ok) {
        setTestSuccess(data.message || 'Connexion reussie !')
        setConnected(true)
        onSuccess()
      } else {
        // Saved but test failed
        setTestSuccess('Identifiants sauvegardes')
        if (data.message) {
          setTestError(data.message)
        }
        onSuccess()
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestError(null)
    setTestSuccess(null)
    try {
      const res = await fetch('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_type: connector.type }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Le test a echoue')
      }
      setTestSuccess(data.message || 'Connexion active !')
      setConnected(true)
      onSuccess()
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Erreur de test')
    } finally {
      setTesting(false)
    }
  }

  // Map connector type to API route path
  const OAUTH_ROUTE_MAP: Partial<Record<ConnectorType, string>> = {
    linkedin_api: 'linkedin',
  }

  function handleOAuthStart() {
    const routePath = OAUTH_ROUTE_MAP[connector.type] || connector.type.replace(/_/g, '-')
    window.location.href = `/api/connectors/${routePath}/connect`
  }

  const allFieldsFilled = connector.fields
    .filter(f => f.required)
    .every(f => credentials[f.key]?.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-hover w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{connector.icon}</span>
            <div>
              <h2 className="font-bold text-ink-700">{connector.label}</h2>
              <p className="text-xs text-ink-300">
                {info?.agentName ? `Agent : ${info.agentName}` : connector.category}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-ink-300 hover:bg-surface-100 hover:text-ink-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* ===== SUCCESS STATE ===== */}
          {connected && !testError && (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-700">{connector.label} connecte !</h3>
                <p className="text-sm text-ink-400 mt-1">
                  {testSuccess || (info?.agentName
                    ? `${info.agentName} peut maintenant utiliser ${connector.label}.`
                    : `Votre connexion ${connector.label} est active.`
                  )}
                </p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {testing ? 'Test en cours...' : 'Tester la connexion'}
              </button>

              {testSuccess && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {testSuccess}
                </div>
              )}

              <button onClick={onClose} className="btn-brand w-full">
                Fermer
              </button>
            </div>
          )}

          {/* ===== OAUTH FLOW (pure OAuth, no extra fields) ===== */}
          {!connected && isOAuth && (
            <div className="space-y-4">
              {/* Brief description */}
              {info?.description && (
                <p className="text-sm text-ink-500 leading-relaxed">
                  {info.description}
                </p>
              )}

              {/* Benefits */}
              {info?.benefits && (
                <div className="bg-surface-50 rounded-xl p-4 space-y-2">
                  {info.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-ink-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-7 h-7 text-brand-500" />
                </div>
                <p className="text-sm text-ink-400">
                  Cliquez ci-dessous pour autoriser l&apos;acces securise. Aucun mot de passe n&apos;est partage.
                </p>
              </div>

              <button onClick={handleOAuthStart} className="btn-brand w-full flex items-center justify-center gap-2 py-3">
                <ExternalLink className="w-4 h-4" />
                Connecter {connector.label}
              </button>

              <div className="flex items-center gap-2 text-xs text-ink-300 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Connexion securisee et chiffree
              </div>
            </div>
          )}

          {/* ===== OAUTH + EXTRA FIELDS (e.g. Google Ads customer_id, GA property_id) ===== */}
          {!connected && hasExtraOAuthFields && (
            <div className="space-y-4">
              {info?.description && (
                <p className="text-sm text-ink-500 leading-relaxed">
                  {info.description}
                </p>
              )}

              {/* Extra fields first */}
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

              <button
                onClick={handleOAuthStart}
                disabled={!allFieldsFilled}
                className="btn-brand w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                Connecter {connector.label}
              </button>

              <div className="flex items-center gap-2 text-xs text-ink-300 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Connexion securisee et chiffree
              </div>
            </div>
          )}

          {/* ===== API KEY / WEBHOOK FLOW ===== */}
          {!connected && !isOAuth && !hasExtraOAuthFields && (
            <div className="space-y-4">
              {/* Brief description */}
              {info?.description && (
                <p className="text-sm text-ink-500 leading-relaxed">
                  {info.description}
                </p>
              )}

              {/* API key instructions — collapsible for cleaner UX */}
              {info?.apiKeyInstructions && (
                <details className="group">
                  <summary className="flex items-center gap-2 text-xs font-semibold text-ink-400 uppercase tracking-wider cursor-pointer hover:text-ink-600 transition-colors">
                    <Key className="w-3.5 h-3.5" />
                    Comment obtenir vos identifiants ?
                    <span className="text-ink-300 group-open:rotate-90 transition-transform">&#9654;</span>
                  </summary>
                  <ol className="mt-3 space-y-2 pl-1">
                    {info.apiKeyInstructions.map((instruction, i) => (
                      <li key={i} className="flex gap-2 text-sm text-ink-600">
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </details>
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
                      autoComplete="off"
                    />
                    {field.helpText && (
                      <p className="text-xs text-ink-300 mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Error message */}
              {testError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {testError}
                </div>
              )}

              {/* Success message */}
              {testSuccess && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {testSuccess}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSaveApiKey}
                disabled={!allFieldsFilled || saving}
                className="btn-brand w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {saving ? 'Connexion en cours...' : 'Connecter'}
              </button>

              <div className="flex items-center gap-2 text-xs text-ink-300 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Identifiants chiffres (AES-256) — jamais partages
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
