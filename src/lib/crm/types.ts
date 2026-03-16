// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CRMType = 'axonaut' | 'obat' | 'vertuoza' | 'toltek' | 'costructor' | 'graneet' | 'extrabat' | 'henrri'

export type CRMConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing'
export type CRMSyncType = 'contacts' | 'devis' | 'factures' | 'chantiers' | 'leads' | 'full'
export type CRMSyncDirection = 'import' | 'export' | 'bidirectional'
export type CRMSyncLogStatus = 'started' | 'success' | 'partial' | 'error'

export interface CRMConfig {
  type: CRMType
  name: string
  description: string
  website: string
  logo: string // emoji placeholder
  color: string // hex
  authMethod: 'api_key' | 'oauth2' | 'api_key_url'
  fields: { key: string; label: string; placeholder: string; type?: string }[]
  supportedEntities: CRMSyncType[]
  apiBaseUrl?: string
}

export const CRM_CONFIGS: CRMConfig[] = [
  {
    type: 'axonaut',
    name: 'Axonaut',
    description: 'CRM/ERP tout-en-un pour TPE/PME',
    website: 'https://axonaut.com',
    logo: '🟠',
    color: '#FF6B35',
    authMethod: 'api_key',
    fields: [{ key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Axonaut', type: 'password' }],
    supportedEntities: ['contacts', 'devis', 'factures', 'leads'],
    apiBaseUrl: 'https://axonaut.com/api/v2',
  },
  {
    type: 'obat',
    name: 'Obat',
    description: 'Logiciel devis et facturation BTP',
    website: 'https://www.obat.fr',
    logo: '🔵',
    color: '#2563EB',
    authMethod: 'api_key_url',
    fields: [
      { key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Obat', type: 'password' },
      { key: 'instance_url', label: 'URL instance', placeholder: 'https://votre-compte.obat.fr' },
    ],
    supportedEntities: ['contacts', 'devis', 'factures', 'chantiers'],
  },
  {
    type: 'vertuoza',
    name: 'Vertuoza',
    description: 'ERP specialise construction et renovation',
    website: 'https://www.vertuoza.com',
    logo: '🟢',
    color: '#059669',
    authMethod: 'api_key',
    fields: [{ key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Vertuoza', type: 'password' }],
    supportedEntities: ['contacts', 'devis', 'factures', 'chantiers'],
  },
  {
    type: 'toltek',
    name: 'Toltek',
    description: 'CRM dedie au BTP et renovation energetique',
    website: 'https://www.toltek.fr',
    logo: '🟡',
    color: '#D97706',
    authMethod: 'api_key',
    fields: [{ key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Toltek', type: 'password' }],
    supportedEntities: ['contacts', 'devis', 'factures', 'chantiers', 'leads'],
  },
  {
    type: 'costructor',
    name: 'Costructor',
    description: 'Logiciel de gestion chantier BTP',
    website: 'https://www.costructor.fr',
    logo: '🔴',
    color: '#DC2626',
    authMethod: 'api_key_url',
    fields: [
      { key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Costructor', type: 'password' },
      { key: 'instance_url', label: 'URL instance', placeholder: 'https://votre-compte.costructor.fr' },
    ],
    supportedEntities: ['contacts', 'devis', 'chantiers'],
  },
  {
    type: 'graneet',
    name: 'Graneet',
    description: 'Plateforme de gestion des travaux et devis',
    website: 'https://www.graneet.com',
    logo: '🟣',
    color: '#7C3AED',
    authMethod: 'api_key',
    fields: [{ key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Graneet', type: 'password' }],
    supportedEntities: ['contacts', 'devis', 'factures', 'chantiers'],
  },
  {
    type: 'extrabat',
    name: 'Extrabat',
    description: 'Logiciel de gestion BTP et artisans',
    website: 'https://www.extrabat.com',
    logo: '🟤',
    color: '#92400E',
    authMethod: 'api_key_url',
    fields: [
      { key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Extrabat', type: 'password' },
      { key: 'instance_url', label: 'URL instance', placeholder: 'https://votre-compte.extrabat.com' },
    ],
    supportedEntities: ['contacts', 'devis', 'factures', 'chantiers', 'leads'],
  },
  {
    type: 'henrri',
    name: 'Henrri',
    description: 'Logiciel de facturation gratuit pour TPE',
    website: 'https://www.henrri.com',
    logo: '⚪',
    color: '#6B7280',
    authMethod: 'api_key',
    fields: [{ key: 'api_key', label: 'Cle API', placeholder: 'Votre cle API Henrri', type: 'password' }],
    supportedEntities: ['contacts', 'devis', 'factures'],
  },
]

export function getCRMConfig(type: CRMType): CRMConfig {
  return CRM_CONFIGS.find(c => c.type === type)!
}

// ─── Entity interfaces ───

export interface CRMContact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  type: 'particulier' | 'professionnel'
  source?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

export interface CRMDevisItem {
  description: string
  quantity: number
  unitPrice: number
  tvaRate: number
  total: number
}

export interface CRMDevis {
  id: string
  reference: string
  contactId: string
  amount: number
  amountTTC: number
  status: 'draft' | 'sent' | 'accepted' | 'refused' | 'expired'
  items: CRMDevisItem[]
  createdAt: string
  validUntil?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

export interface CRMFacture {
  id: string
  reference: string
  contactId: string
  devisId?: string
  amount: number
  amountTTC: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueDate?: string
  paidAt?: string
  createdAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

export interface CRMChantier {
  id: string
  reference: string
  contactId: string
  address: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  startDate?: string
  endDate?: string
  product?: string
  notes?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

export interface CRMLead {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  source?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  product?: string
  notes?: string
  createdAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

// ─── Adapter interface ───

export interface CRMAdapterOptions {
  since?: string
  limit?: number
}

export interface CRMAdapter {
  type: CRMType

  testConnection(): Promise<{ success: boolean; error?: string }>

  getContacts(options?: CRMAdapterOptions): Promise<CRMContact[]>
  getContact(id: string): Promise<CRMContact | null>
  createContact(data: Partial<CRMContact>): Promise<CRMContact>
  updateContact(id: string, data: Partial<CRMContact>): Promise<CRMContact>

  getDevis(options?: CRMAdapterOptions): Promise<CRMDevis[]>
  createDevis(data: Partial<CRMDevis>): Promise<CRMDevis>

  getFactures(options?: CRMAdapterOptions): Promise<CRMFacture[]>
  createFacture(data: Partial<CRMFacture>): Promise<CRMFacture>

  getChantiers(options?: CRMAdapterOptions): Promise<CRMChantier[]>
  updateChantier(id: string, data: Partial<CRMChantier>): Promise<CRMChantier>

  getLeads(options?: CRMAdapterOptions): Promise<CRMLead[]>
  createLead(data: Partial<CRMLead>): Promise<CRMLead>
  updateLead(id: string, data: Partial<CRMLead>): Promise<CRMLead>
}
