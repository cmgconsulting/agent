/**
 * Quote/Devis Generation for Leo
 * Generates professional quotes for ENR projects (poêles, PAC, panneaux solaires)
 * Uses HTML template → returns HTML string (PDF generation via client-side or API)
 */

export interface QuoteLineItem {
  description: string
  quantity: number
  unit_price: number // HT
  tva_rate: number // 5.5, 10, or 20
}

export interface QuoteData {
  // Company info (from client config)
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_siret: string
  company_logo_url?: string
  // Client info
  client_name: string
  client_address: string
  client_phone?: string
  client_email?: string
  // Quote details
  quote_number: string
  date: string
  validity_days: number
  project_type: 'pompe_a_chaleur' | 'panneaux_solaires' | 'poele_a_bois' | 'poele_a_granules' | 'isolation' | 'autre'
  project_description: string
  items: QuoteLineItem[]
  // Aids
  aids?: {
    maprimenov?: number
    cee?: number
    other?: { label: string; amount: number }[]
  }
  // Notes
  notes?: string
  payment_terms?: string
  warranty_info?: string
}

export interface QuoteResult {
  quote_number: string
  total_ht: number
  total_tva: number
  total_ttc: number
  total_aids: number
  reste_a_charge: number
  html: string
}

export function generateQuoteNumber(prefix: string = 'DEV'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  return `${prefix}-${year}${month}-${seq}`
}

export function calculateQuoteTotals(items: QuoteLineItem[], aids?: QuoteData['aids']) {
  let totalHT = 0
  let totalTVA = 0
  const tvaDetails: Record<string, { base: number; amount: number }> = {}

  for (const item of items) {
    const lineHT = item.quantity * item.unit_price
    const lineTVA = lineHT * (item.tva_rate / 100)
    totalHT += lineHT
    totalTVA += lineTVA

    const tvaKey = `${item.tva_rate}%`
    if (!tvaDetails[tvaKey]) tvaDetails[tvaKey] = { base: 0, amount: 0 }
    tvaDetails[tvaKey].base += lineHT
    tvaDetails[tvaKey].amount += lineTVA
  }

  const totalTTC = totalHT + totalTVA
  let totalAids = 0
  if (aids) {
    totalAids += aids.maprimenov || 0
    totalAids += aids.cee || 0
    for (const other of aids.other || []) {
      totalAids += other.amount
    }
  }
  const resteACharge = totalTTC - totalAids

  return { totalHT, totalTVA, totalTTC, totalAids, resteACharge, tvaDetails }
}

export function generateQuoteHTML(data: QuoteData): QuoteResult {
  const quoteNumber = data.quote_number || generateQuoteNumber()
  const { totalHT, totalTVA, totalTTC, totalAids, resteACharge, tvaDetails } = calculateQuoteTotals(data.items, data.aids)

  const formatMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  const projectTypeLabels: Record<string, string> = {
    pompe_a_chaleur: 'Pompe a chaleur',
    panneaux_solaires: 'Panneaux solaires',
    poele_a_bois: 'Poele a bois',
    poele_a_granules: 'Poele a granules',
    isolation: 'Isolation',
    autre: 'Autre',
  }

  const itemsRows = data.items.map(item => {
    const lineTotal = item.quantity * item.unit_price
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${item.description}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(item.unit_price)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.tva_rate}%</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatMoney(lineTotal)}</td>
    </tr>`
  }).join('\n')

  const tvaRows = Object.entries(tvaDetails).map(([rate, d]) =>
    `<tr><td style="padding:4px 8px;">TVA ${rate} (base ${formatMoney(d.base)})</td><td style="padding:4px 8px;text-align:right;">${formatMoney(d.amount)}</td></tr>`
  ).join('\n')

  let aidsSection = ''
  if (data.aids && totalAids > 0) {
    const aidsLines: string[] = []
    if (data.aids.maprimenov) aidsLines.push(`<tr><td style="padding:4px 8px;color:#2e7d32;">MaPrimeRenov</td><td style="padding:4px 8px;text-align:right;color:#2e7d32;">-${formatMoney(data.aids.maprimenov)}</td></tr>`)
    if (data.aids.cee) aidsLines.push(`<tr><td style="padding:4px 8px;color:#2e7d32;">Prime CEE</td><td style="padding:4px 8px;text-align:right;color:#2e7d32;">-${formatMoney(data.aids.cee)}</td></tr>`)
    for (const other of data.aids.other || []) {
      aidsLines.push(`<tr><td style="padding:4px 8px;color:#2e7d32;">${other.label}</td><td style="padding:4px 8px;text-align:right;color:#2e7d32;">-${formatMoney(other.amount)}</td></tr>`)
    }
    aidsSection = `
      <table style="width:300px;margin-left:auto;margin-top:10px;border-collapse:collapse;">
        <tr style="background:#e8f5e9;"><td colspan="2" style="padding:8px;font-weight:bold;">Aides deduites</td></tr>
        ${aidsLines.join('\n')}
        <tr style="background:#c8e6c9;font-weight:bold;">
          <td style="padding:8px;">Reste a charge</td>
          <td style="padding:8px;text-align:right;">${formatMoney(resteACharge)}</td>
        </tr>
      </table>`
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Devis ${quoteNumber}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;margin-bottom:30px;">
    <div>
      <h2 style="margin:0;color:#1565c0;">${data.company_name}</h2>
      <p style="margin:4px 0;font-size:14px;">${data.company_address}</p>
      <p style="margin:4px 0;font-size:14px;">Tel: ${data.company_phone}</p>
      <p style="margin:4px 0;font-size:14px;">${data.company_email}</p>
      <p style="margin:4px 0;font-size:12px;color:#666;">SIRET: ${data.company_siret}</p>
    </div>
    <div style="text-align:right;">
      <h1 style="margin:0;color:#1565c0;font-size:28px;">DEVIS</h1>
      <p style="margin:4px 0;font-size:14px;"><strong>N° ${quoteNumber}</strong></p>
      <p style="margin:4px 0;font-size:14px;">Date : ${data.date}</p>
      <p style="margin:4px 0;font-size:14px;">Validite : ${data.validity_days} jours</p>
    </div>
  </div>

  <!-- Client -->
  <div style="background:#f5f5f5;padding:15px;border-radius:4px;margin-bottom:20px;">
    <p style="margin:0;font-weight:bold;">Client :</p>
    <p style="margin:4px 0;">${data.client_name}</p>
    <p style="margin:4px 0;">${data.client_address}</p>
    ${data.client_phone ? `<p style="margin:4px 0;">Tel: ${data.client_phone}</p>` : ''}
    ${data.client_email ? `<p style="margin:4px 0;">${data.client_email}</p>` : ''}
  </div>

  <!-- Project -->
  <div style="margin-bottom:20px;">
    <h3 style="color:#1565c0;margin-bottom:5px;">Projet : ${projectTypeLabels[data.project_type] || data.project_type}</h3>
    <p style="margin:0;color:#555;">${data.project_description}</p>
  </div>

  <!-- Items -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead>
      <tr style="background:#1565c0;color:white;">
        <th style="padding:10px;text-align:left;">Description</th>
        <th style="padding:10px;text-align:center;">Qte</th>
        <th style="padding:10px;text-align:right;">P.U. HT</th>
        <th style="padding:10px;text-align:center;">TVA</th>
        <th style="padding:10px;text-align:right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Totals -->
  <table style="width:300px;margin-left:auto;border-collapse:collapse;">
    <tr><td style="padding:4px 8px;">Total HT</td><td style="padding:4px 8px;text-align:right;">${formatMoney(totalHT)}</td></tr>
    ${tvaRows}
    <tr style="background:#e3f2fd;font-weight:bold;font-size:16px;">
      <td style="padding:8px;">Total TTC</td>
      <td style="padding:8px;text-align:right;">${formatMoney(totalTTC)}</td>
    </tr>
  </table>

  ${aidsSection}

  <!-- Notes -->
  ${data.notes ? `<div style="margin-top:20px;padding:10px;background:#fff3e0;border-radius:4px;"><p style="margin:0;font-size:13px;">${data.notes}</p></div>` : ''}
  ${data.warranty_info ? `<div style="margin-top:10px;padding:10px;background:#e8f5e9;border-radius:4px;"><p style="margin:0;font-size:13px;"><strong>Garantie :</strong> ${data.warranty_info}</p></div>` : ''}

  <!-- Payment terms -->
  <div style="margin-top:20px;font-size:12px;color:#666;">
    <p><strong>Conditions de paiement :</strong> ${data.payment_terms || 'Acompte de 30% a la commande, solde a la livraison/installation.'}</p>
    <p>Ce devis est valable ${data.validity_days} jours a compter de sa date d'emission.</p>
    <p style="margin-top:20px;">Bon pour accord : Date et signature du client</p>
    <div style="margin-top:40px;border-bottom:1px dotted #999;width:300px;"></div>
  </div>
</body>
</html>`

  return {
    quote_number: quoteNumber,
    total_ht: Math.round(totalHT * 100) / 100,
    total_tva: Math.round(totalTVA * 100) / 100,
    total_ttc: Math.round(totalTTC * 100) / 100,
    total_aids: Math.round(totalAids * 100) / 100,
    reste_a_charge: Math.round(resteACharge * 100) / 100,
    html,
  }
}
