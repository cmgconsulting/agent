import type { KnowledgeFileType } from '@/types/database'

/**
 * Extract text from a file buffer based on its type.
 */
export async function extractText(
  buffer: Buffer,
  fileType: KnowledgeFileType
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractPdf(buffer)
    case 'docx':
      return extractDocx(buffer)
    case 'txt':
    case 'csv':
    case 'md':
      return buffer.toString('utf-8')
    case 'xlsx':
      return extractXlsx(buffer)
    case 'url':
      throw new Error('URL extraction requires a URL, not a buffer')
    default:
      throw new Error(`Type de fichier non supporte: ${fileType}`)
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractXlsx(buffer: Buffer): Promise<string> {
  // Simple CSV-like extraction without heavy dependency
  // Read xlsx as a zip, extract shared strings and sheet data
  // For simplicity, treat as binary text extraction
  // We'll use a basic approach: read the file and extract any readable text
  const text = buffer.toString('utf-8')
  // If it's actually readable (unlikely for xlsx binary), return it
  // Otherwise, return a message indicating xlsx needs special handling
  if (text.includes('<?xml')) {
    // It's an XML-based xlsx, try to extract text from shared strings
    const matches = text.match(/<t[^>]*>([^<]+)<\/t>/g)
    if (matches) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join('\t')
    }
  }
  return '[Contenu XLSX - extraction basique]'
}

/**
 * Fetch and extract text from a URL.
 */
export async function extractFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'CMG-Agents-Bot/1.0' },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Echec du telechargement: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()

  // Strip HTML tags for web pages
  if (contentType.includes('text/html')) {
    return stripHtml(text)
  }

  return text
}

function stripHtml(html: string): string {
  // Remove script and style blocks
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()
  return text
}
