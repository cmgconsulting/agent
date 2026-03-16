import type {
  CRMAdapter, CRMContact, CRMDevis, CRMFacture,
  CRMChantier, CRMLead, CRMAdapterOptions
} from '../types'

const RATE_LIMIT_DELAY = 200 // ms between API calls

export class AxonautAdapter implements CRMAdapter {
  type = 'axonaut' as const
  private apiKey: string
  private baseUrl = 'https://axonaut.com/api/v2'
  private lastCallTime = 0

  constructor(credentials: Record<string, string>) {
    this.apiKey = credentials.api_key
    if (!this.apiKey) throw new Error('Cle API Axonaut manquante')
  }

  private async throttledFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime
    if (timeSinceLastCall < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastCall))
    }
    this.lastCallTime = Date.now()

    const response = await fetch(url, {
      ...options,
      headers: {
        'userApiKey': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (response.status === 429) {
      // Rate limited — wait and retry once
      await new Promise(resolve => setTimeout(resolve, 2000))
      return fetch(url, {
        ...options,
        headers: {
          'userApiKey': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
    }

    return response
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.throttledFetch(`${this.baseUrl}/companies?page=1&per_page=1`)
      if (res.ok) return { success: true }
      const text = await res.text()
      return { success: false, error: `Erreur ${res.status}: ${text}` }
    } catch (err) {
      return { success: false, error: `Connexion impossible: ${(err as Error).message}` }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapContact(data: any): CRMContact {
    return {
      id: String(data.id),
      firstName: data.first_name || '',
      lastName: data.last_name || data.name || '',
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address?.street || undefined,
      city: data.address?.city || undefined,
      postalCode: data.address?.zip_code || undefined,
      type: data.is_company ? 'professionnel' : 'particulier',
      source: data.custom_fields?.source || undefined,
      notes: data.comments || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      raw: data,
    }
  }

  async getContacts(options?: CRMAdapterOptions): Promise<CRMContact[]> {
    const params = new URLSearchParams()
    params.set('per_page', String(options?.limit || 50))
    params.set('page', '1')
    if (options?.since) params.set('updated_after', options.since)

    const res = await this.throttledFetch(`${this.baseUrl}/companies?${params}`)
    if (!res.ok) throw new Error(`Erreur Axonaut: ${res.status}`)
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(data) ? data : data.companies || []).map((c: any) => this.mapContact(c))
  }

  async getContact(id: string): Promise<CRMContact | null> {
    const res = await this.throttledFetch(`${this.baseUrl}/companies/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Erreur Axonaut: ${res.status}`)
    return this.mapContact(await res.json())
  }

  async createContact(data: Partial<CRMContact>): Promise<CRMContact> {
    const body = {
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      is_company: data.type === 'professionnel',
      address: data.address ? { street: data.address, city: data.city, zip_code: data.postalCode } : undefined,
      comments: data.notes,
    }
    const res = await this.throttledFetch(`${this.baseUrl}/companies`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Erreur creation contact: ${res.status}`)
    return this.mapContact(await res.json())
  }

  async updateContact(id: string, data: Partial<CRMContact>): Promise<CRMContact> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {}
    if (data.firstName) body.first_name = data.firstName
    if (data.lastName) body.last_name = data.lastName
    if (data.email) body.email = data.email
    if (data.phone) body.phone = data.phone
    if (data.notes) body.comments = data.notes

    const res = await this.throttledFetch(`${this.baseUrl}/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Erreur mise a jour contact: ${res.status}`)
    return this.mapContact(await res.json())
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDevis(data: any): CRMDevis {
    const statusMap: Record<string, CRMDevis['status']> = {
      draft: 'draft', sent: 'sent', accepted: 'accepted', refused: 'refused', expired: 'expired',
    }
    return {
      id: String(data.id),
      reference: data.number || data.reference || '',
      contactId: String(data.company_id || ''),
      amount: data.total_amount || 0,
      amountTTC: data.total_amount_with_tax || data.total_amount || 0,
      status: statusMap[data.status] || 'draft',
      items: (data.lines || []).map((l: Record<string, number | string>) => ({
        description: l.description || '',
        quantity: l.quantity || 0,
        unitPrice: l.unit_price || 0,
        tvaRate: l.tax_rate || 20,
        total: l.total || 0,
      })),
      createdAt: data.created_at || new Date().toISOString(),
      validUntil: data.valid_until || undefined,
      raw: data,
    }
  }

  async getDevis(options?: CRMAdapterOptions): Promise<CRMDevis[]> {
    const params = new URLSearchParams()
    params.set('per_page', String(options?.limit || 50))
    if (options?.since) params.set('updated_after', options.since)

    const res = await this.throttledFetch(`${this.baseUrl}/quotations?${params}`)
    if (!res.ok) throw new Error(`Erreur Axonaut devis: ${res.status}`)
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(data) ? data : data.quotations || []).map((d: any) => this.mapDevis(d))
  }

  async createDevis(data: Partial<CRMDevis>): Promise<CRMDevis> {
    const body = {
      company_id: data.contactId ? Number(data.contactId) : undefined,
      lines: (data.items || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.tvaRate || 20,
      })),
    }
    const res = await this.throttledFetch(`${this.baseUrl}/quotations`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Erreur creation devis: ${res.status}`)
    return this.mapDevis(await res.json())
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFacture(data: any): CRMFacture {
    const statusMap: Record<string, CRMFacture['status']> = {
      draft: 'draft', sent: 'sent', paid: 'paid', overdue: 'overdue', cancelled: 'cancelled',
    }
    return {
      id: String(data.id),
      reference: data.number || data.reference || '',
      contactId: String(data.company_id || ''),
      devisId: data.quotation_id ? String(data.quotation_id) : undefined,
      amount: data.total_amount || 0,
      amountTTC: data.total_amount_with_tax || data.total_amount || 0,
      status: statusMap[data.status] || 'draft',
      dueDate: data.due_date || undefined,
      paidAt: data.paid_at || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      raw: data,
    }
  }

  async getFactures(options?: CRMAdapterOptions): Promise<CRMFacture[]> {
    const params = new URLSearchParams()
    params.set('per_page', String(options?.limit || 50))
    if (options?.since) params.set('updated_after', options.since)

    const res = await this.throttledFetch(`${this.baseUrl}/invoices?${params}`)
    if (!res.ok) throw new Error(`Erreur Axonaut factures: ${res.status}`)
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(data) ? data : data.invoices || []).map((f: any) => this.mapFacture(f))
  }

  async createFacture(data: Partial<CRMFacture>): Promise<CRMFacture> {
    const body = {
      company_id: data.contactId ? Number(data.contactId) : undefined,
      quotation_id: data.devisId ? Number(data.devisId) : undefined,
    }
    const res = await this.throttledFetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Erreur creation facture: ${res.status}`)
    return this.mapFacture(await res.json())
  }

  async getChantiers(_options?: CRMAdapterOptions): Promise<CRMChantier[]> {
    // Axonaut doesn't have a native "chantier" entity — use projects
    return []
  }

  async updateChantier(_id: string, _data: Partial<CRMChantier>): Promise<CRMChantier> {
    throw new Error('Axonaut ne supporte pas les chantiers nativement')
  }

  async getLeads(options?: CRMAdapterOptions): Promise<CRMLead[]> {
    // Axonaut treats leads as companies with a specific status
    const contacts = await this.getContacts(options)
    return contacts
      .filter(c => c.raw.lead_status || c.raw.is_prospect)
      .map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        source: c.source,
        status: 'new' as const,
        product: c.raw.custom_fields?.product || undefined,
        notes: c.notes,
        createdAt: c.createdAt,
        raw: c.raw,
      }))
  }

  async createLead(data: Partial<CRMLead>): Promise<CRMLead> {
    const contact = await this.createContact({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      type: 'particulier',
    })
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      source: data.source,
      status: 'new',
      product: data.product,
      notes: data.notes,
      createdAt: contact.createdAt,
      raw: contact.raw,
    }
  }

  async updateLead(id: string, data: Partial<CRMLead>): Promise<CRMLead> {
    const contact = await this.updateContact(id, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
    })
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      source: data.source,
      status: data.status || 'new',
      product: data.product,
      notes: data.notes || contact.notes,
      createdAt: contact.createdAt,
      raw: contact.raw,
    }
  }
}
