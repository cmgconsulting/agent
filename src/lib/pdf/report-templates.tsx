import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import { styles, colors } from './styles'

// ──── Reusable components ────

function ReportHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  return (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.headerBrand}>CMG Agents</Text>
        <Text style={styles.headerDate}>Genere le {dateStr}</Text>
      </View>
    </View>
  )
}

function SummaryCards({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={styles.summaryRow}>
      {items.map((item, i) => (
        <View key={i} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{item.label}</Text>
          <Text style={styles.summaryValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

function ReportTable({ title, headers, rows, widths }: {
  title?: string
  headers: string[]
  rows: string[][]
  widths: number[]
}) {
  return (
    <View style={styles.tableContainer}>
      {title && <Text style={styles.tableTitle}>{title}</Text>}
      <View style={styles.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.tableHeaderCell, { width: `${widths[i]}%` }]}>{h}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[styles.tableCell, { width: `${widths[ci]}%` }]}>{cell}</Text>
          ))}
        </View>
      ))}
      {rows.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: colors.gray400 }]}>
            Aucune donnee
          </Text>
        </View>
      )}
    </View>
  )
}

function ReportFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>CMG Agents — Rapport confidentiel</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
    </View>
  )
}

// ──── Log report (admin global) ────

interface LogRow {
  created_at: string
  status: string
  action: string
  tokens_used?: number
  duration_ms?: number
  agent_type?: string
  agent_name?: string
  client_name?: string
}

export async function renderLogReportPdf(
  logs: LogRow[],
  stats: { totalLogs: number; successCount: number; errorCount: number; totalTokens: number }
): Promise<Buffer> {
  const successRate = stats.totalLogs > 0 ? Math.round((stats.successCount / stats.totalLogs) * 100) : 100

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader title="Rapport des Logs" subtitle="Vue globale de toutes les operations" />

        <SummaryCards items={[
          { label: 'Total operations', value: String(stats.totalLogs) },
          { label: 'Taux de succes', value: `${successRate}%` },
          { label: 'Erreurs', value: String(stats.errorCount) },
          { label: 'Tokens utilises', value: stats.totalTokens > 1000 ? `${Math.round(stats.totalTokens / 1000)}k` : String(stats.totalTokens) },
        ]} />

        <ReportTable
          title="Dernieres operations"
          headers={['Date', 'Statut', 'Agent', 'Client', 'Action', 'Tokens']}
          widths={[15, 8, 12, 15, 38, 12]}
          rows={logs.slice(0, 100).map(log => [
            new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
            log.status,
            log.agent_name || log.agent_type || '',
            log.client_name || '',
            (log.action || '').substring(0, 60),
            String(log.tokens_used || 0),
          ])}
        />

        <ReportFooter />
      </Page>
    </Document>
  )

  return await renderToBuffer(doc) as unknown as Buffer
}

// ──── Client report (admin per-client) ────

export async function renderClientReportPdf(
  clientName: string,
  plan: string,
  logs: LogRow[],
  tokenStats?: { totalTokens: number; totalCost: number }
): Promise<Buffer> {
  const successCount = logs.filter(l => l.status === 'success').length
  const errorCount = logs.filter(l => l.status === 'error').length
  const totalTokens = tokenStats?.totalTokens || logs.reduce((s, l) => s + (l.tokens_used || 0), 0)

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader title={`Rapport — ${clientName}`} subtitle={`Plan: ${plan}`} />

        <SummaryCards items={[
          { label: 'Operations', value: String(logs.length) },
          { label: 'Succes', value: String(successCount) },
          { label: 'Erreurs', value: String(errorCount) },
          { label: 'Tokens', value: totalTokens > 1000 ? `${Math.round(totalTokens / 1000)}k` : String(totalTokens) },
        ]} />

        <ReportTable
          title="Historique des operations"
          headers={['Date', 'Statut', 'Agent', 'Action', 'Tokens', 'Duree (ms)']}
          widths={[15, 10, 12, 38, 12, 13]}
          rows={logs.slice(0, 100).map(log => [
            new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
            log.status,
            log.agent_name || log.agent_type || '',
            (log.action || '').substring(0, 60),
            String(log.tokens_used || 0),
            String(log.duration_ms || 0),
          ])}
        />

        <ReportFooter />
      </Page>
    </Document>
  )

  return await renderToBuffer(doc) as unknown as Buffer
}

// ──── ROI report (client-facing) ────

interface RoiRow {
  created_at: string
  agent_name: string
  task_type: string
  estimated_human_minutes: number
  agent_duration_seconds: number
  tokens_used: number
  status: string
}

export async function renderRoiReportPdf(
  companyName: string,
  rows: RoiRow[],
  summary: { totalHumanMinutes: number; totalAgentSeconds: number; totalTokens: number }
): Promise<Buffer> {
  const hoursHuman = Math.round(summary.totalHumanMinutes / 60)
  const hoursAgent = Math.round(summary.totalAgentSeconds / 3600 * 10) / 10

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader title="Rapport ROI" subtitle={companyName} />

        <SummaryCards items={[
          { label: 'Temps humain estime', value: `${hoursHuman}h` },
          { label: 'Temps agent', value: `${hoursAgent}h` },
          { label: 'Operations', value: String(rows.length) },
          { label: 'Tokens utilises', value: summary.totalTokens > 1000 ? `${Math.round(summary.totalTokens / 1000)}k` : String(summary.totalTokens) },
        ]} />

        <ReportTable
          title="Detail des operations"
          headers={['Date', 'Agent', 'Tache', 'Humain (min)', 'Agent (sec)', 'Tokens', 'Statut']}
          widths={[13, 12, 20, 12, 12, 12, 10]}
          rows={rows.slice(0, 100).map(r => [
            new Date(r.created_at).toLocaleDateString('fr-FR'),
            r.agent_name,
            (r.task_type || '').substring(0, 30),
            String(r.estimated_human_minutes),
            String(r.agent_duration_seconds),
            String(r.tokens_used),
            r.status,
          ])}
        />

        <ReportFooter />
      </Page>
    </Document>
  )

  return await renderToBuffer(doc) as unknown as Buffer
}
