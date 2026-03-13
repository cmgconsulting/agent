/**
 * Felix — Financial Analysis & Alerts
 * Margin calculation per project, cash flow forecasting, alerts
 */

// ============================================
// TYPES
// ============================================

export interface ProjectFinancials {
  project_id: string
  project_name: string
  client_name: string
  project_type: string
  // Revenue
  quote_amount_ht: number
  invoiced_amount_ht: number
  paid_amount: number
  // Costs
  material_cost: number
  labor_cost: number
  subcontractor_cost: number
  other_costs: number
  // Dates
  start_date: string
  end_date?: string
  status: 'en_cours' | 'termine' | 'en_attente'
}

export interface MarginAnalysis {
  project_id: string
  project_name: string
  client_name: string
  revenue_ht: number
  total_costs: number
  margin_ht: number
  margin_percent: number
  status: 'healthy' | 'warning' | 'critical'
  cost_breakdown: {
    material: number
    labor: number
    subcontractor: number
    other: number
  }
}

export interface MarginAlert {
  level: 'warning' | 'critical'
  project_id: string
  project_name: string
  message: string
  margin_percent: number
  threshold: number
}

export interface CashFlowEntry {
  date: string
  label: string
  type: 'income' | 'expense'
  amount: number
  category: string
  cumulative: number
}

export interface CashFlowForecast {
  period_days: number
  start_date: string
  end_date: string
  entries: CashFlowEntry[]
  summary: {
    total_income: number
    total_expenses: number
    net_cash_flow: number
    opening_balance: number
    closing_balance: number
    lowest_balance: number
    lowest_balance_date: string
  }
}

export interface FinancialDashboard {
  period: string
  total_revenue: number
  total_costs: number
  overall_margin: number
  overall_margin_percent: number
  projects_count: number
  avg_margin_percent: number
  alerts: MarginAlert[]
  top_projects: MarginAnalysis[]
  worst_projects: MarginAnalysis[]
}

// ============================================
// MARGIN CALCULATION
// ============================================

export function calculateMargin(project: ProjectFinancials): MarginAnalysis {
  const totalCosts = project.material_cost + project.labor_cost + project.subcontractor_cost + project.other_costs
  const revenueHT = project.invoiced_amount_ht || project.quote_amount_ht
  const marginHT = revenueHT - totalCosts
  const marginPercent = revenueHT > 0 ? (marginHT / revenueHT) * 100 : 0

  let status: MarginAnalysis['status'] = 'healthy'
  if (marginPercent < 10) status = 'critical'
  else if (marginPercent < 20) status = 'warning'

  return {
    project_id: project.project_id,
    project_name: project.project_name,
    client_name: project.client_name,
    revenue_ht: Math.round(revenueHT * 100) / 100,
    total_costs: Math.round(totalCosts * 100) / 100,
    margin_ht: Math.round(marginHT * 100) / 100,
    margin_percent: Math.round(marginPercent * 10) / 10,
    status,
    cost_breakdown: {
      material: project.material_cost,
      labor: project.labor_cost,
      subcontractor: project.subcontractor_cost,
      other: project.other_costs,
    },
  }
}

export function analyzeAllMargins(projects: ProjectFinancials[]): {
  analyses: MarginAnalysis[]
  alerts: MarginAlert[]
  dashboard: FinancialDashboard
} {
  const analyses = projects.map(calculateMargin)
  const alerts = checkMarginAlerts(analyses)

  const totalRevenue = analyses.reduce((s, a) => s + a.revenue_ht, 0)
  const totalCosts = analyses.reduce((s, a) => s + a.total_costs, 0)
  const overallMargin = totalRevenue - totalCosts
  const overallMarginPercent = totalRevenue > 0 ? (overallMargin / totalRevenue) * 100 : 0
  const avgMarginPercent = analyses.length > 0
    ? analyses.reduce((s, a) => s + a.margin_percent, 0) / analyses.length
    : 0

  const sorted = [...analyses].sort((a, b) => b.margin_percent - a.margin_percent)

  return {
    analyses,
    alerts,
    dashboard: {
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_costs: Math.round(totalCosts * 100) / 100,
      overall_margin: Math.round(overallMargin * 100) / 100,
      overall_margin_percent: Math.round(overallMarginPercent * 10) / 10,
      projects_count: projects.length,
      avg_margin_percent: Math.round(avgMarginPercent * 10) / 10,
      alerts,
      top_projects: sorted.slice(0, 3),
      worst_projects: sorted.slice(-3).reverse(),
    },
  }
}

// ============================================
// ALERTS
// ============================================

export function checkMarginAlerts(
  analyses: MarginAnalysis[],
  thresholds?: { warning?: number; critical?: number }
): MarginAlert[] {
  const warningThreshold = thresholds?.warning ?? 20
  const criticalThreshold = thresholds?.critical ?? 10
  const alerts: MarginAlert[] = []

  for (const a of analyses) {
    if (a.margin_percent < criticalThreshold) {
      alerts.push({
        level: 'critical',
        project_id: a.project_id,
        project_name: a.project_name,
        message: `Marge critique sur "${a.project_name}" : ${a.margin_percent}% (seuil: ${criticalThreshold}%)`,
        margin_percent: a.margin_percent,
        threshold: criticalThreshold,
      })
    } else if (a.margin_percent < warningThreshold) {
      alerts.push({
        level: 'warning',
        project_id: a.project_id,
        project_name: a.project_name,
        message: `Marge faible sur "${a.project_name}" : ${a.margin_percent}% (seuil: ${warningThreshold}%)`,
        margin_percent: a.margin_percent,
        threshold: warningThreshold,
      })
    }
  }

  return alerts.sort((a, b) => a.margin_percent - b.margin_percent)
}

// ============================================
// CASH FLOW FORECAST
// ============================================

export function generateCashFlowForecast(params: {
  opening_balance: number
  period_days: number
  expected_incomes: { date: string; label: string; amount: number; category: string }[]
  expected_expenses: { date: string; label: string; amount: number; category: string }[]
  recurring_expenses?: { label: string; amount: number; category: string; day_of_month: number }[]
}): CashFlowForecast {
  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + params.period_days * 86400000)

  // Combine all entries
  const entries: CashFlowEntry[] = []

  // Add expected incomes
  for (const inc of params.expected_incomes) {
    entries.push({ date: inc.date, label: inc.label, type: 'income', amount: inc.amount, category: inc.category, cumulative: 0 })
  }

  // Add expected expenses
  for (const exp of params.expected_expenses) {
    entries.push({ date: exp.date, label: exp.label, type: 'expense', amount: exp.amount, category: exp.category, cumulative: 0 })
  }

  // Add recurring expenses for the forecast period
  if (params.recurring_expenses) {
    for (const rec of params.recurring_expenses) {
      const current = new Date(startDate)
      while (current <= endDate) {
        const day = rec.day_of_month
        const targetDate = new Date(current.getFullYear(), current.getMonth(), day)
        if (targetDate >= startDate && targetDate <= endDate) {
          const dateStr = targetDate.toISOString().split('T')[0]
          // Avoid duplicates
          if (!entries.some(e => e.label === rec.label && e.date === dateStr)) {
            entries.push({ date: dateStr, label: rec.label, type: 'expense', amount: rec.amount, category: rec.category, cumulative: 0 })
          }
        }
        current.setMonth(current.getMonth() + 1)
      }
    }
  }

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date))

  // Calculate cumulative
  let cumulative = params.opening_balance
  let lowestBalance = cumulative
  let lowestDate = startDate.toISOString().split('T')[0]

  for (const entry of entries) {
    if (entry.type === 'income') {
      cumulative += entry.amount
    } else {
      cumulative -= entry.amount
    }
    entry.cumulative = Math.round(cumulative * 100) / 100

    if (cumulative < lowestBalance) {
      lowestBalance = cumulative
      lowestDate = entry.date
    }
  }

  const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  return {
    period_days: params.period_days,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    entries,
    summary: {
      total_income: Math.round(totalIncome * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net_cash_flow: Math.round((totalIncome - totalExpenses) * 100) / 100,
      opening_balance: params.opening_balance,
      closing_balance: Math.round(cumulative * 100) / 100,
      lowest_balance: Math.round(lowestBalance * 100) / 100,
      lowest_balance_date: lowestDate,
    },
  }
}

// ============================================
// REPORT GENERATION
// ============================================

export function generateFinancialReport(dashboard: FinancialDashboard): string {
  let report = `📊 RAPPORT FINANCIER — ${dashboard.period}\n`
  report += `${'='.repeat(50)}\n\n`

  report += `📈 VUE GLOBALE\n`
  report += `  CA total HT: ${dashboard.total_revenue.toLocaleString('fr-FR')} €\n`
  report += `  Couts totaux: ${dashboard.total_costs.toLocaleString('fr-FR')} €\n`
  report += `  Marge globale: ${dashboard.overall_margin.toLocaleString('fr-FR')} € (${dashboard.overall_margin_percent}%)\n`
  report += `  Marge moyenne: ${dashboard.avg_margin_percent}%\n`
  report += `  Projets: ${dashboard.projects_count}\n\n`

  if (dashboard.alerts.length > 0) {
    report += `⚠️ ALERTES (${dashboard.alerts.length})\n`
    for (const alert of dashboard.alerts) {
      const icon = alert.level === 'critical' ? '🔴' : '🟡'
      report += `  ${icon} ${alert.message}\n`
    }
    report += '\n'
  }

  if (dashboard.top_projects.length > 0) {
    report += `🏆 TOP PROJETS\n`
    for (const p of dashboard.top_projects) {
      report += `  ✅ ${p.project_name} — ${p.margin_percent}% (${p.margin_ht.toLocaleString('fr-FR')} €)\n`
    }
    report += '\n'
  }

  if (dashboard.worst_projects.length > 0) {
    report += `📉 PROJETS A SURVEILLER\n`
    for (const p of dashboard.worst_projects) {
      report += `  ⚠️ ${p.project_name} — ${p.margin_percent}% (${p.margin_ht.toLocaleString('fr-FR')} €)\n`
    }
  }

  return report
}

export function generateCashFlowReport(forecast: CashFlowForecast): string {
  let report = `💰 TRESORERIE — Previsionnel ${forecast.period_days} jours\n`
  report += `${'='.repeat(50)}\n\n`
  report += `📅 Periode: ${forecast.start_date} → ${forecast.end_date}\n\n`

  report += `📊 RESUME\n`
  report += `  Solde initial: ${forecast.summary.opening_balance.toLocaleString('fr-FR')} €\n`
  report += `  Encaissements prevus: +${forecast.summary.total_income.toLocaleString('fr-FR')} €\n`
  report += `  Decaissements prevus: -${forecast.summary.total_expenses.toLocaleString('fr-FR')} €\n`
  report += `  Flux net: ${forecast.summary.net_cash_flow >= 0 ? '+' : ''}${forecast.summary.net_cash_flow.toLocaleString('fr-FR')} €\n`
  report += `  Solde final prevu: ${forecast.summary.closing_balance.toLocaleString('fr-FR')} €\n`
  report += `  Point bas: ${forecast.summary.lowest_balance.toLocaleString('fr-FR')} € (${forecast.summary.lowest_balance_date})\n\n`

  if (forecast.summary.lowest_balance < 0) {
    report += `🔴 ALERTE: Tresorerie negative prevue le ${forecast.summary.lowest_balance_date}!\n\n`
  }

  report += `📋 DETAIL MOUVEMENTS\n`
  for (const entry of forecast.entries) {
    const sign = entry.type === 'income' ? '+' : '-'
    const icon = entry.type === 'income' ? '📥' : '📤'
    report += `  ${entry.date} ${icon} ${sign}${entry.amount.toLocaleString('fr-FR')} € — ${entry.label} [${entry.category}] (solde: ${entry.cumulative.toLocaleString('fr-FR')} €)\n`
  }

  return report
}
