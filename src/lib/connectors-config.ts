import type { ConnectorType } from '@/types/database'

export type AuthMethod = 'oauth2' | 'api_key' | 'webhook'

export interface ConnectorField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  placeholder?: string
  required: boolean
  helpText?: string
}

export interface ConnectorConfig {
  type: ConnectorType
  label: string
  category: string
  icon: string
  authMethod: AuthMethod
  fields: ConnectorField[]
  testEndpoint?: string
  oauthScopes?: string[]
}

export const CONNECTORS: ConnectorConfig[] = [
  // Email
  {
    type: 'gmail',
    label: 'Gmail',
    category: 'Email',
    icon: '📧',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  },
  {
    type: 'outlook',
    label: 'Outlook / Office 365',
    category: 'Email',
    icon: '📨',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: ['Mail.ReadWrite', 'Mail.Send'],
  },
  {
    type: 'brevo',
    label: 'Brevo (Sendinblue)',
    category: 'Email',
    icon: '💌',
    authMethod: 'api_key',
    fields: [
      { key: 'api_key', label: 'Cle API Brevo', type: 'password', required: true, placeholder: 'xkeysib-...' },
    ],
  },
  {
    type: 'mailchimp',
    label: 'Mailchimp',
    category: 'Email',
    icon: '🐵',
    authMethod: 'api_key',
    fields: [
      { key: 'api_key', label: 'Cle API Mailchimp', type: 'password', required: true, placeholder: 'xxxxxxx-us21' },
      { key: 'server_prefix', label: 'Prefixe serveur', type: 'text', required: true, placeholder: 'us21', helpText: 'Visible dans votre URL Mailchimp' },
    ],
  },

  // SMS / WhatsApp
  {
    type: 'whatsapp',
    label: 'WhatsApp Business',
    category: 'SMS / WhatsApp',
    icon: '💬',
    authMethod: 'api_key',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'verify_token', label: 'Verify Token (webhook)', type: 'text', required: true },
    ],
  },
  {
    type: 'twilio',
    label: 'Twilio SMS',
    category: 'SMS / WhatsApp',
    icon: '📱',
    authMethod: 'api_key',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true, placeholder: 'ACxxxxxxxx' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'phone_number', label: 'Numero Twilio', type: 'text', required: true, placeholder: '+33...' },
    ],
  },

  // Social
  {
    type: 'meta_api',
    label: 'Meta (Facebook + Instagram)',
    category: 'Reseaux sociaux',
    icon: '📘',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: ['pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
  },
  {
    type: 'linkedin_api',
    label: 'LinkedIn',
    category: 'Reseaux sociaux',
    icon: '💼',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: ['w_member_social', 'r_liteprofile'],
  },

  // Ads
  {
    type: 'meta_ads',
    label: 'Meta Ads',
    category: 'Publicite',
    icon: '📢',
    authMethod: 'api_key',
    fields: [
      { key: 'access_token', label: 'Access Token Meta Ads', type: 'password', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true, placeholder: 'act_xxxxx' },
    ],
  },
  {
    type: 'google_ads',
    label: 'Google Ads',
    category: 'Publicite',
    icon: '🔍',
    authMethod: 'oauth2',
    fields: [
      { key: 'customer_id', label: 'Customer ID', type: 'text', required: true, placeholder: '123-456-7890' },
    ],
    oauthScopes: ['https://www.googleapis.com/auth/adwords'],
  },

  // CRM / BDD
  {
    type: 'airtable',
    label: 'Airtable',
    category: 'CRM / Base de donnees',
    icon: '📋',
    authMethod: 'api_key',
    fields: [
      { key: 'api_key', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'pat...' },
    ],
  },
  {
    type: 'hubspot',
    label: 'HubSpot',
    category: 'CRM / Base de donnees',
    icon: '🧡',
    authMethod: 'api_key',
    fields: [
      { key: 'access_token', label: 'Access Token HubSpot', type: 'password', required: true },
    ],
  },

  // Documents
  {
    type: 'notion',
    label: 'Notion',
    category: 'Documents',
    icon: '📝',
    authMethod: 'api_key',
    fields: [
      { key: 'api_key', label: 'Integration Token Notion', type: 'password', required: true, placeholder: 'secret_...' },
    ],
  },
  {
    type: 'google_docs',
    label: 'Google Docs',
    category: 'Documents',
    icon: '📄',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
  },

  // Visuels
  {
    type: 'canva',
    label: 'Canva',
    category: 'Visuels',
    icon: '🎨',
    authMethod: 'api_key',
    fields: [
      { key: 'api_key', label: 'Cle API Canva', type: 'password', required: true },
    ],
  },

  // Analytics
  {
    type: 'google_analytics',
    label: 'Google Analytics',
    category: 'Analytics',
    icon: '📊',
    authMethod: 'oauth2',
    fields: [
      { key: 'property_id', label: 'Property ID (GA4)', type: 'text', required: true, placeholder: '123456789' },
    ],
    oauthScopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },

  // Compta
  {
    type: 'pennylane',
    label: 'Pennylane',
    category: 'Comptabilite',
    icon: '🏦',
    authMethod: 'api_key',
    fields: [
      { key: 'api_key', label: 'Cle API Pennylane', type: 'password', required: true },
      { key: 'company_id', label: 'ID Societe', type: 'text', required: false },
    ],
  },
  {
    type: 'sellsy',
    label: 'Sellsy',
    category: 'Comptabilite',
    icon: '💼',
    authMethod: 'api_key',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  {
    type: 'quickbooks',
    label: 'QuickBooks',
    category: 'Comptabilite',
    icon: '📗',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: ['com.intuit.quickbooks.accounting'],
  },
  {
    type: 'google_sheets',
    label: 'Google Sheets',
    category: 'Comptabilite',
    icon: '📊',
    authMethod: 'oauth2',
    fields: [],
    oauthScopes: ['https://www.googleapis.com/auth/spreadsheets'],
  },

  // Orchestration
  {
    type: 'make_com',
    label: 'Make.com',
    category: 'Orchestration',
    icon: '⚡',
    authMethod: 'webhook',
    fields: [
      { key: 'webhook_url', label: 'URL du Webhook Make', type: 'url', required: true, placeholder: 'https://hook.make.com/...' },
      { key: 'webhook_secret', label: 'Secret de validation', type: 'password', required: false, helpText: 'Optionnel : pour valider les requetes entrantes' },
    ],
  },
]

export const CONNECTOR_CATEGORIES = [
  'Email', 'SMS / WhatsApp', 'Reseaux sociaux', 'Publicite',
  'CRM / Base de donnees', 'Documents', 'Visuels', 'Analytics',
  'Comptabilite', 'Orchestration',
]

export function getConnectorConfig(type: ConnectorType): ConnectorConfig | undefined {
  return CONNECTORS.find(c => c.type === type)
}
