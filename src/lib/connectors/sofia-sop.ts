/**
 * Sofia — SOP & Organigramme Generator
 * Creates Standard Operating Procedures and org charts from company data
 * Exports to Notion via API
 */

// ============================================
// TYPES
// ============================================

export interface Employee {
  name: string
  role: string
  department: string
  manager?: string  // name of direct manager
  email?: string
  phone?: string
}

export interface OrgNode {
  employee: Employee
  children: OrgNode[]
}

export interface OrgChartResult {
  root: OrgNode
  total_employees: number
  departments: string[]
  html: string
}

export interface SOPStep {
  order: number
  title: string
  description: string
  responsible: string    // role or name
  tools?: string[]       // tools/systems used
  duration?: string      // estimated duration
  notes?: string
}

export interface SOPDocument {
  title: string
  category: 'installation' | 'maintenance' | 'commercial' | 'administratif' | 'sav' | 'autre'
  version: string
  created_at: string
  author: string
  objective: string
  scope: string
  steps: SOPStep[]
  kpis?: string[]
  revision_history?: { date: string; version: string; changes: string }[]
}

export interface SOPResult {
  sop_id: string
  title: string
  category: string
  total_steps: number
  html: string
  markdown: string
}

// ============================================
// NOTION API
// ============================================

interface NotionAuth {
  api_key: string
}

async function notionRequest<T>(auth: NotionAuth, path: string, method: string = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${auth.api_key}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Notion API error ${res.status}: ${error}`)
  }
  return res.json() as Promise<T>
}

export async function createNotionPage(auth: NotionAuth, params: {
  parent_id: string      // database_id or page_id
  parent_type: 'database_id' | 'page_id'
  title: string
  content_markdown: string
  properties?: Record<string, unknown>
}): Promise<{ id: string; url: string }> {
  const children = markdownToNotionBlocks(params.content_markdown)

  const parent = params.parent_type === 'database_id'
    ? { database_id: params.parent_id }
    : { page_id: params.parent_id }

  const properties = params.parent_type === 'database_id'
    ? {
        ...params.properties,
        Name: { title: [{ text: { content: params.title } }] },
      }
    : {
        title: { title: [{ text: { content: params.title } }] },
      }

  const result = await notionRequest<{ id: string; url: string }>(auth, '/pages', 'POST', {
    parent,
    properties,
    children: children.slice(0, 100), // Notion max 100 blocks per request
  })

  return { id: result.id, url: result.url }
}

function markdownToNotionBlocks(markdown: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ text: { content: line.slice(2) } }] },
      })
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ text: { content: line.slice(3) } }] },
      })
    } else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ text: { content: line.slice(4) } }] },
      })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ text: { content: line.slice(2) } }] },
      })
    } else if (/^\d+\.\s/.test(line)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: [{ text: { content: line.replace(/^\d+\.\s/, '') } }] },
      })
    } else if (line.startsWith('---')) {
      blocks.push({ object: 'block', type: 'divider', divider: {} })
    } else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: line } }] },
      })
    }
  }

  return blocks
}

// ============================================
// ORG CHART GENERATION
// ============================================

export function buildOrgChart(employees: Employee[]): OrgChartResult {
  // Build node map
  const nodeMap = new Map<string, OrgNode>()
  for (const emp of employees) {
    nodeMap.set(emp.name, { employee: emp, children: [] })
  }

  // Find root (no manager) and connect children
  let root: OrgNode | null = null
  for (const emp of employees) {
    const node = nodeMap.get(emp.name)!
    if (!emp.manager) {
      root = node
    } else {
      const parent = nodeMap.get(emp.manager)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  // If no root found, create a virtual one
  if (!root) {
    root = {
      employee: { name: 'Direction', role: 'Direction Generale', department: 'Direction' },
      children: Array.from(nodeMap.values()).filter(n => !n.employee.manager),
    }
  }

  const departments = Array.from(new Set(employees.map(e => e.department)))

  return {
    root,
    total_employees: employees.length,
    departments,
    html: generateOrgChartHTML(root, departments),
  }
}

function generateOrgChartHTML(root: OrgNode, departments: string[]): string {
  const deptColors: Record<string, string> = {}
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
  departments.forEach((d, i) => {
    deptColors[d] = colors[i % colors.length]
  })

  function renderNode(node: OrgNode, level: number = 0): string {
    const color = deptColors[node.employee.department] || '#6B7280'
    const indent = level * 40
    let html = `
      <div style="margin-left:${indent}px;margin-bottom:8px;">
        <div style="display:inline-block;padding:10px 16px;border-radius:8px;border:2px solid ${color};background:${color}10;">
          <strong style="color:${color}">${node.employee.name}</strong><br/>
          <span style="font-size:13px;color:#4B5563">${node.employee.role}</span><br/>
          <span style="font-size:12px;color:#9CA3AF">${node.employee.department}</span>
        </div>
      </div>`

    for (const child of node.children) {
      html += renderNode(child, level + 1)
    }
    return html
  }

  return `
    <div style="font-family:system-ui,sans-serif;padding:24px;">
      <h2 style="color:#1F2937;margin-bottom:16px;">Organigramme</h2>
      <div style="margin-bottom:16px;">
        ${departments.map(d => `<span style="display:inline-block;margin-right:12px;padding:4px 8px;border-radius:4px;background:${deptColors[d]}20;color:${deptColors[d]};font-size:12px;font-weight:600">${d}</span>`).join('')}
      </div>
      ${renderNode(root)}
    </div>`
}

// ============================================
// SOP GENERATION
// ============================================

export function generateSOPId(): string {
  const ts = Date.now().toString(36).toUpperCase()
  return `SOP-${ts}`
}

export function generateSOP(doc: SOPDocument): SOPResult {
  const sopId = generateSOPId()
  const markdown = generateSOPMarkdown(doc)
  const html = generateSOPHTML(doc, sopId)

  return {
    sop_id: sopId,
    title: doc.title,
    category: doc.category,
    total_steps: doc.steps.length,
    html,
    markdown,
  }
}

function generateSOPMarkdown(doc: SOPDocument): string {
  let md = `# ${doc.title}\n\n`
  md += `**Categorie:** ${doc.category}\n`
  md += `**Version:** ${doc.version}\n`
  md += `**Date:** ${doc.created_at}\n`
  md += `**Auteur:** ${doc.author}\n\n`
  md += `## Objectif\n${doc.objective}\n\n`
  md += `## Perimetre\n${doc.scope}\n\n`
  md += `## Etapes\n\n`

  for (const step of doc.steps) {
    md += `### ${step.order}. ${step.title}\n`
    md += `${step.description}\n`
    md += `- **Responsable:** ${step.responsible}\n`
    if (step.tools?.length) md += `- **Outils:** ${step.tools.join(', ')}\n`
    if (step.duration) md += `- **Duree estimee:** ${step.duration}\n`
    if (step.notes) md += `- **Notes:** ${step.notes}\n`
    md += '\n'
  }

  if (doc.kpis?.length) {
    md += `## KPIs de suivi\n`
    for (const kpi of doc.kpis) {
      md += `- ${kpi}\n`
    }
  }

  return md
}

function generateSOPHTML(doc: SOPDocument, sopId: string): string {
  const categoryColors: Record<string, string> = {
    installation: '#3B82F6',
    maintenance: '#10B981',
    commercial: '#F59E0B',
    administratif: '#8B5CF6',
    sav: '#EF4444',
    autre: '#6B7280',
  }
  const color = categoryColors[doc.category] || '#6B7280'

  const stepsHtml = doc.steps.map(step => `
    <div style="margin-bottom:20px;padding:16px;border-radius:8px;border-left:4px solid ${color};background:#F9FAFB;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${color};color:white;font-weight:700;font-size:14px;">${step.order}</span>
        <h3 style="margin:0;color:#1F2937;font-size:16px;">${step.title}</h3>
      </div>
      <p style="margin:8px 0;color:#4B5563;">${step.description}</p>
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:#6B7280;">
        <span>👤 ${step.responsible}</span>
        ${step.tools?.length ? `<span>🔧 ${step.tools.join(', ')}</span>` : ''}
        ${step.duration ? `<span>⏱ ${step.duration}</span>` : ''}
      </div>
      ${step.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#9CA3AF;font-style:italic;">📝 ${step.notes}</p>` : ''}
    </div>
  `).join('')

  return `
    <div style="font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:32px;">
      <div style="margin-bottom:24px;">
        <span style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${color}20;color:${color};font-size:13px;font-weight:600;text-transform:uppercase;margin-bottom:8px;">${doc.category}</span>
        <h1 style="margin:8px 0;color:#1F2937;">${doc.title}</h1>
        <div style="display:flex;gap:16px;font-size:13px;color:#9CA3AF;">
          <span>📋 ${sopId}</span>
          <span>v${doc.version}</span>
          <span>📅 ${doc.created_at}</span>
          <span>✍️ ${doc.author}</span>
        </div>
      </div>
      <div style="margin-bottom:24px;padding:16px;border-radius:8px;background:#EFF6FF;">
        <h3 style="margin:0 0 8px;color:#1E40AF;font-size:14px;">🎯 Objectif</h3>
        <p style="margin:0;color:#1E3A8A;">${doc.objective}</p>
      </div>
      <div style="margin-bottom:24px;padding:16px;border-radius:8px;background:#F0FDF4;">
        <h3 style="margin:0 0 8px;color:#166534;font-size:14px;">📐 Perimetre</h3>
        <p style="margin:0;color:#15803D;">${doc.scope}</p>
      </div>
      <h2 style="color:#1F2937;margin-bottom:16px;">Etapes (${doc.steps.length})</h2>
      ${stepsHtml}
      ${doc.kpis?.length ? `
        <div style="margin-top:24px;padding:16px;border-radius:8px;background:#FEF3C7;">
          <h3 style="margin:0 0 8px;color:#92400E;font-size:14px;">📊 KPIs de suivi</h3>
          <ul style="margin:0;padding-left:20px;color:#B45309;">
            ${doc.kpis.map(k => `<li>${k}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>`
}
