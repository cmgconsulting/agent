import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, sanitizeString } from '@/lib/security'
import type { ClientBrandingConfig } from '@/types/database'

// ============================================
// TYPES
// ============================================

type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'email'

interface ExportBody {
  content: string
  format: ExportFormat
  title?: string
}

const VALID_FORMATS: ExportFormat[] = ['pdf', 'docx', 'pptx', 'email']
const STORAGE_BUCKET = 'generated-exports'

// ============================================
// HELPERS
// ============================================

/** Strip HTML tags and normalise whitespace to get plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Sanitise a filename token (keep alphanumerics, dashes, underscores). */
function safeFilename(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60)
}

/** Build the default branding when no record exists. */
function defaultBranding(clientId: string): ClientBrandingConfig {
  return {
    id: '',
    client_id: clientId,
    logo_url: null,
    primary_color: '#2563EB',
    secondary_color: '#10B981',
    font_family: 'Inter',
    slogan: null,
    address: null,
    phone: null,
    contact_email: null,
    website: null,
    legal_mentions: null,
    templates: {},
    created_at: '',
    updated_at: '',
  }
}

// ============================================
// GENERATORS
// ============================================

async function generatePdf(
  plainText: string,
  title: string,
  branding: ClientBrandingConfig
): Promise<Buffer> {
  const {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
  } = await import('@react-pdf/renderer')

  const React = await import('react')

  const primaryColor = branding.primary_color || '#2563EB'
  const secondaryColor = branding.secondary_color || '#10B981'

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 11,
      paddingTop: 50,
      paddingBottom: 65,
      paddingHorizontal: 40,
      backgroundColor: '#FFFFFF',
    },
    header: {
      backgroundColor: primaryColor,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 24,
      borderRadius: 4,
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
    },
    headerSlogan: {
      color: '#FFFFFFCC',
      fontSize: 10,
      marginTop: 4,
    },
    sectionBar: {
      backgroundColor: secondaryColor,
      height: 3,
      marginBottom: 16,
      borderRadius: 2,
    },
    paragraph: {
      marginBottom: 8,
      lineHeight: 1.6,
      color: '#1F2937',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      paddingTop: 8,
    },
    footerText: {
      fontSize: 8,
      color: '#9CA3AF',
    },
  })

  const paragraphs = plainText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const footerLines: string[] = []
  if (branding.legal_mentions) footerLines.push(branding.legal_mentions)
  if (branding.address) footerLines.push(branding.address)
  if (branding.contact_email) footerLines.push(branding.contact_email)
  if (branding.phone) footerLines.push(branding.phone)
  const footerText = footerLines.join('  |  ')

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, title),
        branding.slogan
          ? React.createElement(Text, { style: styles.headerSlogan }, branding.slogan)
          : null
      ),
      // Accent bar
      React.createElement(View, { style: styles.sectionBar }),
      // Content paragraphs
      ...paragraphs.map((para, i) =>
        React.createElement(Text, { key: i, style: styles.paragraph }, para)
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, footerText)
      )
    )
  )

  const buffer = await renderToBuffer(doc)
  return Buffer.from(buffer)
}

async function generateDocx(
  plainText: string,
  title: string,
  branding: ClientBrandingConfig
): Promise<Buffer> {
  const docxLib = await import('docx')
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Header,
    Footer,
    PageNumber,
    convertInchesToTwip,
  } = docxLib

  const primaryHex = (branding.primary_color || '#2563EB').replace('#', '')
  const secondaryHex = (branding.secondary_color || '#10B981').replace('#', '')

  const paragraphs = plainText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const footerParts: string[] = []
  if (branding.legal_mentions) footerParts.push(branding.legal_mentions)
  if (branding.address) footerParts.push(branding.address)
  if (branding.contact_email) footerParts.push(branding.contact_email)
  const footerStr = footerParts.join('  |  ')

  const contentParagraphs = paragraphs.map(para =>
    new Paragraph({
      children: [new TextRun({ text: para, size: 22, font: branding.font_family || 'Calibri' })],
      spacing: { after: 120 },
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 28,
                    color: primaryHex,
                    font: branding.font_family || 'Calibri',
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 },
                border: {
                  bottom: { style: 'single', size: 6, color: secondaryHex },
                },
              }),
              ...(branding.slogan
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: branding.slogan,
                          italics: true,
                          size: 18,
                          color: '6B7280',
                          font: branding.font_family || 'Calibri',
                        }),
                      ],
                      spacing: { after: 240 },
                    }),
                  ]
                : []),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  ...(footerStr
                    ? [
                        new TextRun({
                          text: footerStr + '  —  ',
                          size: 16,
                          color: '9CA3AF',
                        }),
                      ]
                    : []),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '9CA3AF',
                  }),
                ],
              }),
            ],
          }),
        },
        children: contentParagraphs,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}

async function generatePptx(
  plainText: string,
  title: string,
  branding: ClientBrandingConfig
): Promise<Buffer> {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()

  const primaryColor = (branding.primary_color || '#2563EB').replace('#', '')
  const secondaryColor = (branding.secondary_color || '#10B981').replace('#', '')

  // Define slide master
  pptx.defineSlideMaster({
    title: 'BRANDED_MASTER',
    background: { color: 'FFFFFF' },
    objects: [
      // Top color bar
      {
        rect: {
          x: 0,
          y: 0,
          w: '100%',
          h: 0.12,
          fill: { color: primaryColor },
        },
      },
      // Bottom accent bar
      {
        rect: {
          x: 0,
          y: 7.38,
          w: '100%',
          h: 0.12,
          fill: { color: secondaryColor },
        },
      },
      // Footer text
      ...(branding.legal_mentions || branding.address
        ? [
            {
              text: {
                text: [
                  branding.legal_mentions,
                  branding.address,
                  branding.contact_email,
                ]
                  .filter(Boolean)
                  .join('  |  '),
                options: {
                  x: 0.3,
                  y: 7.2,
                  w: 9.4,
                  h: 0.2,
                  fontSize: 7,
                  color: '9CA3AF',
                  align: 'center' as const,
                },
              },
            },
          ]
        : []),
    ],
  })

  // Title slide
  const titleSlide = pptx.addSlide({ masterName: 'BRANDED_MASTER' })
  titleSlide.addText(title, {
    x: 0.5,
    y: 1.5,
    w: 9.0,
    h: 1.2,
    fontSize: 36,
    bold: true,
    color: primaryColor,
    align: 'center',
    fontFace: branding.font_family || 'Calibri',
  })
  if (branding.slogan) {
    titleSlide.addText(branding.slogan, {
      x: 0.5,
      y: 2.9,
      w: 9.0,
      h: 0.6,
      fontSize: 16,
      color: '6B7280',
      align: 'center',
      italic: true,
      fontFace: branding.font_family || 'Calibri',
    })
  }

  // Content slides — split every ~8 paragraphs
  const paragraphs = plainText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const PARAS_PER_SLIDE = 8
  const chunks: string[][] = []
  for (let i = 0; i < paragraphs.length; i += PARAS_PER_SLIDE) {
    chunks.push(paragraphs.slice(i, i + PARAS_PER_SLIDE))
  }

  chunks.forEach((chunk, idx) => {
    const slide = pptx.addSlide({ masterName: 'BRANDED_MASTER' })

    // Slide number header label
    slide.addText(`${idx + 1} / ${chunks.length}`, {
      x: 8.8,
      y: 0.15,
      w: 1.0,
      h: 0.25,
      fontSize: 9,
      color: 'FFFFFF',
      align: 'right',
    })

    slide.addText(
      chunk.map(para => ({ text: para + '\n', options: {} })),
      {
        x: 0.5,
        y: 0.5,
        w: 9.0,
        h: 6.6,
        fontSize: 14,
        color: '1F2937',
        fontFace: branding.font_family || 'Calibri',
        valign: 'top',
        wrap: true,
      }
    )
  })

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer
  return Buffer.from(buffer)
}

function generateEmail(
  plainText: string,
  title: string,
  branding: ClientBrandingConfig
): string {
  const primaryColor = branding.primary_color || '#2563EB'
  const secondaryColor = branding.secondary_color || '#10B981'
  const font = branding.font_family || 'Inter, sans-serif'

  const paragraphsHtml = plainText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1F2937;">${l}</p>`)
    .join('\n')

  const footerItems: string[] = []
  if (branding.legal_mentions) footerItems.push(branding.legal_mentions)
  if (branding.address) footerItems.push(branding.address)
  if (branding.contact_email) footerItems.push(`<a href="mailto:${branding.contact_email}" style="color:${primaryColor};text-decoration:none;">${branding.contact_email}</a>`)
  if (branding.phone) footerItems.push(branding.phone)
  if (branding.website) footerItems.push(`<a href="${branding.website}" style="color:${primaryColor};text-decoration:none;">${branding.website}</a>`)

  const footerHtml = footerItems.length
    ? `<p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">${footerItems.join(' &nbsp;|&nbsp; ')}</p>`
    : ''

  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="Logo" style="max-height:50px;max-width:180px;object-fit:contain;margin-bottom:8px;" /><br/>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:${font};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${primaryColor};padding:24px 32px;">
              ${logoHtml}
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:${font};">${title}</h1>
              ${branding.slogan ? `<p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);">${branding.slogan}</p>` : ''}
            </td>
          </tr>
          <!-- Accent bar -->
          <tr>
            <td style="background:${secondaryColor};height:4px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              ${paragraphsHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #E5E7EB;">
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================
// POST — Generate export
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    // Rate limit: 5/min for exports
    const rl = checkRateLimit(`export:${user.id}`, RATE_LIMITS.export)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requetes d\'export. Reessayez dans une minute.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      )
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('user_id', user.id)
      .single()

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    let body: ExportBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requete JSON invalide' }, { status: 400 })
    }

    const { content, format, title: rawTitle } = body

    // Validate required fields
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Le champ \'content\' est requis' }, { status: 400 })
    }
    if (!format || !VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Format invalide. Valeurs acceptees: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedContent = sanitizeString(content, 200_000)
    const title = rawTitle ? sanitizeString(String(rawTitle), 200) : `Export ${new Date().toLocaleDateString('fr-FR')}`

    // Strip HTML for non-email formats
    const plainText = format === 'email' ? sanitizedContent : stripHtml(sanitizedContent)

    // Fetch branding
    const { data: brandingRow } = await supabase
      .from('client_branding_config')
      .select('*')
      .eq('client_id', client.id)
      .single()

    const branding: ClientBrandingConfig = brandingRow ?? defaultBranding(client.id)

    const adminClient = createServiceRoleClient()
    const timestamp = Date.now()
    const safeTitle = safeFilename(title)

    // Generate by format
    if (format === 'email') {
      const html = generateEmail(plainText, title, branding)

      // Save to storage as .html
      const fileName = `${timestamp}_${safeTitle}.html`
      const storagePath = `${client.id}/${fileName}`

      const { error: uploadError } = await adminClient.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, Buffer.from(html, 'utf-8'), {
          contentType: 'text/html',
          upsert: false,
        })

      if (uploadError) {
        console.error('[exports] HTML upload error:', uploadError)
        // Non-blocking: return html anyway
      }

      const { data: publicUrl } = adminClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)

      return NextResponse.json({
        format: 'email',
        file_name: fileName,
        download_url: publicUrl?.publicUrl ?? null,
        html,
      })
    }

    // Binary formats
    const extMap: Record<Exclude<ExportFormat, 'email'>, string> = {
      pdf: 'pdf',
      docx: 'docx',
      pptx: 'pptx',
    }
    const mimeMap: Record<Exclude<ExportFormat, 'email'>, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }

    let fileBuffer: Buffer
    try {
      if (format === 'pdf') {
        fileBuffer = await generatePdf(plainText, title, branding)
      } else if (format === 'docx') {
        fileBuffer = await generateDocx(plainText, title, branding)
      } else {
        // pptx
        fileBuffer = await generatePptx(plainText, title, branding)
      }
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : 'Erreur inconnue'
      console.error(`[exports] Generation error (${format}):`, msg)
      return NextResponse.json(
        { error: `Erreur lors de la generation du fichier ${format}: ${msg}` },
        { status: 500 }
      )
    }

    const ext = extMap[format as Exclude<ExportFormat, 'email'>]
    const fileName = `${timestamp}_${safeTitle}.${ext}`
    const storagePath = `${client.id}/${fileName}`
    const mimeType = mimeMap[format as Exclude<ExportFormat, 'email'>]

    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[exports] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Erreur lors du stockage du fichier: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: publicUrl } = adminClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    return NextResponse.json({
      format,
      file_name: fileName,
      download_url: publicUrl?.publicUrl ?? null,
    })
  } catch (err) {
    console.error('[exports] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
