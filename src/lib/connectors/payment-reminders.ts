/**
 * Payment Reminder Workflow for Leo
 * Automates unpaid invoice follow-up: J+7, J+14, J+21
 */

export type ReminderLevel = 'first' | 'second' | 'final'

export interface ReminderConfig {
  level: ReminderLevel
  days_overdue: number
  subject: string
  tone: 'friendly' | 'firm' | 'formal'
}

export interface UnpaidInvoice {
  invoice_id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  amount: number // TTC
  currency: string
  due_date: string // ISO date
  days_overdue: number
}

export interface ReminderAction {
  invoice: UnpaidInvoice
  reminder_level: ReminderLevel
  channel: 'email' | 'sms' | 'both'
  email_subject: string
  email_body: string
  sms_text?: string
}

// Reminder schedule
const REMINDER_SCHEDULE: ReminderConfig[] = [
  { level: 'first', days_overdue: 7, subject: 'Rappel - Facture {number} en attente', tone: 'friendly' },
  { level: 'second', days_overdue: 14, subject: 'Relance - Facture {number} impayee', tone: 'firm' },
  { level: 'final', days_overdue: 21, subject: 'Derniere relance - Facture {number}', tone: 'formal' },
]

export function getReminderSchedule(): ReminderConfig[] {
  return REMINDER_SCHEDULE
}

export function determineReminderLevel(daysOverdue: number): ReminderLevel | null {
  if (daysOverdue >= 21) return 'final'
  if (daysOverdue >= 14) return 'second'
  if (daysOverdue >= 7) return 'first'
  return null
}

export function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = now.getTime() - due.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const formatMoney = (n: number, currency: string = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n)

export function generateReminderEmail(invoice: UnpaidInvoice, level: ReminderLevel, companyName: string): { subject: string; body: string } {
  const config = REMINDER_SCHEDULE.find(r => r.level === level)!
  const subject = config.subject.replace('{number}', invoice.invoice_number)
  const amount = formatMoney(invoice.amount, invoice.currency)
  const dueDate = new Date(invoice.due_date).toLocaleDateString('fr-FR')

  const bodies: Record<ReminderLevel, string> = {
    first: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <p>Bonjour ${invoice.customer_name},</p>
  <p>Nous nous permettons de vous rappeler que la facture <strong>n° ${invoice.invoice_number}</strong> d'un montant de <strong>${amount}</strong>, dont l'echeance etait fixee au <strong>${dueDate}</strong>, reste en attente de reglement.</p>
  <p>Si le paiement a deja ete effectue, nous vous prions de ne pas tenir compte de ce message.</p>
  <p>Dans le cas contraire, nous vous serions reconnaissants de bien vouloir proceder au reglement dans les meilleurs delais.</p>
  <p>N'hesitez pas a nous contacter si vous avez des questions.</p>
  <p>Cordialement,<br>${companyName}</p>
</div>`,

    second: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <p>Bonjour ${invoice.customer_name},</p>
  <p>Sauf erreur de notre part, nous n'avons toujours pas recu le reglement de la facture <strong>n° ${invoice.invoice_number}</strong> d'un montant de <strong>${amount}</strong>, echue depuis le <strong>${dueDate}</strong>, soit <strong>${invoice.days_overdue} jours</strong> de retard.</p>
  <p>Nous vous remercions de bien vouloir regulariser cette situation dans les plus brefs delais.</p>
  <p>Si vous rencontrez des difficultes, nous restons a votre disposition pour trouver une solution ensemble.</p>
  <p>Cordialement,<br>${companyName}</p>
</div>`,

    final: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <p>Bonjour ${invoice.customer_name},</p>
  <p>Malgre nos precedentes relances, la facture <strong>n° ${invoice.invoice_number}</strong> d'un montant de <strong>${amount}</strong>, echue depuis le <strong>${dueDate}</strong>, demeure impayee (<strong>${invoice.days_overdue} jours</strong> de retard).</p>
  <p>Nous vous informons que sans reglement sous <strong>7 jours</strong>, nous serons contraints d'engager les procedures de recouvrement prevues par la loi.</p>
  <p>Conformement a l'article L.441-10 du Code de commerce, des penalites de retard et une indemnite forfaitaire de 40 EUR pour frais de recouvrement sont applicables.</p>
  <p>Nous vous prions d'effectuer le reglement dans les meilleurs delais.</p>
  <p>Cordialement,<br>${companyName}</p>
</div>`,
  }

  return { subject, body: bodies[level] }
}

export function generateReminderSMS(invoice: UnpaidInvoice, level: ReminderLevel, companyName: string): string {
  const amount = formatMoney(invoice.amount, invoice.currency)

  const messages: Record<ReminderLevel, string> = {
    first: `${companyName}: Rappel facture ${invoice.invoice_number} de ${amount} echue le ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}. Merci de proceder au reglement. Contactez-nous pour toute question.`,
    second: `${companyName}: 2eme relance facture ${invoice.invoice_number} (${amount}), ${invoice.days_overdue}j de retard. Merci de regulariser rapidement.`,
    final: `${companyName}: DERNIERE RELANCE facture ${invoice.invoice_number} (${amount}), ${invoice.days_overdue}j de retard. Sans reglement sous 7j, procedure de recouvrement.`,
  }

  return messages[level]
}

export function generateReminderActions(invoices: UnpaidInvoice[], companyName: string): ReminderAction[] {
  const actions: ReminderAction[] = []

  for (const invoice of invoices) {
    const level = determineReminderLevel(invoice.days_overdue)
    if (!level) continue

    const email = generateReminderEmail(invoice, level, companyName)
    const smsText = invoice.customer_phone
      ? generateReminderSMS(invoice, level, companyName)
      : undefined

    actions.push({
      invoice,
      reminder_level: level,
      channel: invoice.customer_phone ? 'both' : 'email',
      email_subject: email.subject,
      email_body: email.body,
      sms_text: smsText,
    })
  }

  return actions
}
