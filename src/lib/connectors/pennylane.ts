/**
 * Pennylane API Integration for Leo
 * Handles invoices, payments, and customer management
 * API docs: https://pennylane.com/api
 */

const PENNYLANE_API_BASE = 'https://app.pennylane.com/api/external/v1'

interface PennylaneAuth {
  api_key: string
}

interface PennylaneCustomer {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  billing_address?: {
    address: string
    postal_code: string
    city: string
    country_alpha2: string
  }
}

interface PennylaneInvoiceLine {
  label: string
  quantity: number
  unit_price: number // in cents
  vat_rate: string // e.g. "FR_200", "FR_55", "FR_100"
  unit: string // "piece", "hour", etc.
}

interface PennylaneInvoiceInput {
  customer_id: number
  date: string // YYYY-MM-DD
  deadline: string // YYYY-MM-DD
  draft: boolean
  currency: string
  line_items: PennylaneInvoiceLine[]
  special_mention?: string
  pdf_invoice_subject?: string
}

interface PennylaneInvoice {
  id: number
  invoice_number: string
  status: string
  date: string
  deadline: string
  total: number
  currency: string
  remaining_amount: number
  customer: { id: number; name: string }
  file_url?: string
  paid: boolean
}

// ===== API Helpers =====

async function pennylaneRequest<T>(
  auth: PennylaneAuth,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
  body?: unknown
): Promise<T> {
  const res = await fetch(`${PENNYLANE_API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${auth.api_key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Pennylane API error ${res.status}: ${errorBody}`)
  }

  return res.json() as Promise<T>
}

// ===== Customers =====

export async function listCustomers(auth: PennylaneAuth, params?: {
  page?: number
  per_page?: number
  filter?: string
}): Promise<{ customers: PennylaneCustomer[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.per_page) searchParams.set('per_page', String(params.per_page || 25))
  if (params?.filter) searchParams.set('filter', `[{"field":"name","operator":"search","value":"${params.filter}"}]`)

  const qs = searchParams.toString()
  const data = await pennylaneRequest<{ customers: PennylaneCustomer[]; total_pages: number; current_page: number; total_customers: number }>(
    auth,
    `/customers${qs ? `?${qs}` : ''}`
  )
  return { customers: data.customers, total: data.total_customers }
}

export async function getCustomer(auth: PennylaneAuth, customerId: number): Promise<PennylaneCustomer> {
  const data = await pennylaneRequest<{ customer: PennylaneCustomer }>(auth, `/customers/${customerId}`)
  return data.customer
}

export async function createCustomer(auth: PennylaneAuth, customer: {
  name: string
  email?: string
  phone?: string
  address?: string
  postal_code?: string
  city?: string
}): Promise<PennylaneCustomer> {
  const data = await pennylaneRequest<{ customer: PennylaneCustomer }>(auth, '/customers', 'POST', {
    customer: {
      customer_type: 'individual',
      first_name: customer.name.split(' ')[0] || customer.name,
      last_name: customer.name.split(' ').slice(1).join(' ') || '',
      emails: customer.email ? [customer.email] : [],
      phone: customer.phone || undefined,
      billing_address: customer.address ? {
        address: customer.address,
        postal_code: customer.postal_code || '',
        city: customer.city || '',
        country_alpha2: 'FR',
      } : undefined,
    },
  })
  return data.customer
}

// ===== Invoices =====

export async function createInvoice(auth: PennylaneAuth, invoice: PennylaneInvoiceInput): Promise<PennylaneInvoice> {
  const data = await pennylaneRequest<{ invoice: PennylaneInvoice }>(auth, '/customer_invoices', 'POST', {
    invoice: {
      customer_id: invoice.customer_id,
      date: invoice.date,
      deadline: invoice.deadline,
      draft: invoice.draft,
      currency: invoice.currency || 'EUR',
      special_mention: invoice.special_mention || '',
      pdf_invoice_subject: invoice.pdf_invoice_subject || '',
      line_items_sections_attributes: [{
        title: '',
        rank: 1,
        line_items_attributes: invoice.line_items.map((item, i) => ({
          label: item.label,
          quantity: item.quantity,
          currency_amount: item.unit_price, // in cents
          vat_rate: item.vat_rate,
          unit: item.unit || 'piece',
          rank: i + 1,
        })),
      }],
    },
  })
  return data.invoice
}

export async function listInvoices(auth: PennylaneAuth, params?: {
  page?: number
  per_page?: number
  status?: 'draft' | 'pending' | 'paid' | 'late'
  customer_id?: number
}): Promise<{ invoices: PennylaneInvoice[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.per_page) searchParams.set('per_page', String(params.per_page || 25))

  const filters: { field: string; operator: string; value: string }[] = []
  if (params?.status) {
    filters.push({ field: 'status', operator: 'eq', value: params.status })
  }
  if (params?.customer_id) {
    filters.push({ field: 'customer_id', operator: 'eq', value: String(params.customer_id) })
  }
  if (filters.length > 0) {
    searchParams.set('filter', JSON.stringify(filters))
  }

  const qs = searchParams.toString()
  const data = await pennylaneRequest<{ invoices: PennylaneInvoice[]; total_pages: number; total_invoices: number }>(
    auth,
    `/customer_invoices${qs ? `?${qs}` : ''}`
  )
  return { invoices: data.invoices, total: data.total_invoices }
}

export async function getInvoice(auth: PennylaneAuth, invoiceId: number): Promise<PennylaneInvoice> {
  const data = await pennylaneRequest<{ invoice: PennylaneInvoice }>(auth, `/customer_invoices/${invoiceId}`)
  return data.invoice
}

export async function finalizeInvoice(auth: PennylaneAuth, invoiceId: number): Promise<PennylaneInvoice> {
  const data = await pennylaneRequest<{ invoice: PennylaneInvoice }>(auth, `/customer_invoices/${invoiceId}/finalize`, 'PUT')
  return data.invoice
}

export async function sendInvoiceByEmail(auth: PennylaneAuth, invoiceId: number): Promise<{ success: boolean }> {
  await pennylaneRequest(auth, `/customer_invoices/${invoiceId}/send_by_email`, 'POST')
  return { success: true }
}

// ===== Unpaid/Late invoices =====

export async function getUnpaidInvoices(auth: PennylaneAuth): Promise<PennylaneInvoice[]> {
  const result = await listInvoices(auth, { status: 'late', per_page: 100 })
  return result.invoices
}

export async function getPendingInvoices(auth: PennylaneAuth): Promise<PennylaneInvoice[]> {
  const result = await listInvoices(auth, { status: 'pending', per_page: 100 })
  return result.invoices
}

// ===== VAT rate helper =====

export function getVATRateCode(rate: number): string {
  switch (rate) {
    case 5.5: return 'FR_55'
    case 10: return 'FR_100'
    case 20: return 'FR_200'
    case 0: return 'FR_exempt'
    default: return 'FR_200'
  }
}

export function amountToCents(amount: number): number {
  return Math.round(amount * 100)
}
