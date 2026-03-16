import type {
  CRMAdapter, CRMContact, CRMDevis, CRMFacture,
  CRMChantier, CRMLead, CRMAdapterOptions
} from '../types'

export class ObatAdapter implements CRMAdapter {
  type = 'obat' as const
  private apiKey: string
  private instanceUrl: string

  constructor(credentials: Record<string, string>) {
    this.apiKey = credentials.api_key
    this.instanceUrl = credentials.instance_url || ''
    if (!this.apiKey) throw new Error('Cle API Obat manquante')
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Integration Obat en cours de developpement' }
  }

  async getContacts(_options?: CRMAdapterOptions): Promise<CRMContact[]> { throw new Error('Not implemented yet') }
  async getContact(_id: string): Promise<CRMContact | null> { throw new Error('Not implemented yet') }
  async createContact(_data: Partial<CRMContact>): Promise<CRMContact> { throw new Error('Not implemented yet') }
  async updateContact(_id: string, _data: Partial<CRMContact>): Promise<CRMContact> { throw new Error('Not implemented yet') }
  async getDevis(_options?: CRMAdapterOptions): Promise<CRMDevis[]> { throw new Error('Not implemented yet') }
  async createDevis(_data: Partial<CRMDevis>): Promise<CRMDevis> { throw new Error('Not implemented yet') }
  async getFactures(_options?: CRMAdapterOptions): Promise<CRMFacture[]> { throw new Error('Not implemented yet') }
  async createFacture(_data: Partial<CRMFacture>): Promise<CRMFacture> { throw new Error('Not implemented yet') }
  async getChantiers(_options?: CRMAdapterOptions): Promise<CRMChantier[]> { throw new Error('Not implemented yet') }
  async updateChantier(_id: string, _data: Partial<CRMChantier>): Promise<CRMChantier> { throw new Error('Not implemented yet') }
  async getLeads(_options?: CRMAdapterOptions): Promise<CRMLead[]> { throw new Error('Not implemented yet') }
  async createLead(_data: Partial<CRMLead>): Promise<CRMLead> { throw new Error('Not implemented yet') }
  async updateLead(_id: string, _data: Partial<CRMLead>): Promise<CRMLead> { throw new Error('Not implemented yet') }
}
