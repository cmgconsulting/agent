/**
 * Airtable API integration
 * Used by Ludo for SAV ticket management
 */

interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
  createdTime: string
}

// ===== Records =====

export async function createRecord(params: {
  apiKey: string
  baseId: string
  tableId: string
  fields: Record<string, unknown>
}): Promise<AirtableRecord> {
  const { apiKey, baseId, tableId, fields } = params

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Airtable create error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

export async function updateRecord(params: {
  apiKey: string
  baseId: string
  tableId: string
  recordId: string
  fields: Record<string, unknown>
}): Promise<AirtableRecord> {
  const { apiKey, baseId, tableId, recordId, fields } = params

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Airtable update error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

export async function listRecords(params: {
  apiKey: string
  baseId: string
  tableId: string
  filterFormula?: string
  maxRecords?: number
  sort?: { field: string; direction: 'asc' | 'desc' }[]
}): Promise<AirtableRecord[]> {
  const { apiKey, baseId, tableId, filterFormula, maxRecords = 100, sort } = params

  const queryParams = new URLSearchParams({ maxRecords: String(maxRecords) })
  if (filterFormula) queryParams.set('filterByFormula', filterFormula)
  if (sort?.length) {
    sort.forEach((s, i) => {
      queryParams.set(`sort[${i}][field]`, s.field)
      queryParams.set(`sort[${i}][direction]`, s.direction)
    })
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?${queryParams}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Airtable list error: ${err.error?.message || res.status}`)
  }

  const data = await res.json()
  return data.records || []
}

export async function getRecord(params: {
  apiKey: string
  baseId: string
  tableId: string
  recordId: string
}): Promise<AirtableRecord> {
  const { apiKey, baseId, tableId, recordId } = params

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${recordId}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Airtable get error: ${err.error?.message || res.status}`)
  }

  return res.json()
}

// ===== Bases & Tables discovery =====

export async function listBases(apiKey: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch('https://api.airtable.com/v0/meta/bases', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) throw new Error(`Airtable bases error: ${res.status}`)

  const data = await res.json()
  return (data.bases || []).map((b: { id: string; name: string }) => ({
    id: b.id,
    name: b.name,
  }))
}

export async function listTables(params: {
  apiKey: string
  baseId: string
}): Promise<{ id: string; name: string; fields: { id: string; name: string; type: string }[] }[]> {
  const { apiKey, baseId } = params

  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )

  if (!res.ok) throw new Error(`Airtable tables error: ${res.status}`)

  const data = await res.json()
  return (data.tables || []).map((t: { id: string; name: string; fields: { id: string; name: string; type: string }[] }) => ({
    id: t.id,
    name: t.name,
    fields: t.fields.map(f => ({ id: f.id, name: f.name, type: f.type })),
  }))
}
