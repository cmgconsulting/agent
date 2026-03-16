/**
 * Split text into chunks of approximately `maxTokens` tokens
 * with `overlapTokens` overlap between consecutive chunks.
 *
 * Uses a simple word-based tokenizer (~0.75 words per token for French).
 */

const CHARS_PER_TOKEN = 4 // rough approximation

export interface TextChunk {
  content: string
  chunk_index: number
  metadata: Record<string, unknown>
}

export function chunkText(
  text: string,
  options?: {
    maxTokens?: number
    overlapTokens?: number
  }
): TextChunk[] {
  const maxTokens = options?.maxTokens || 500
  const overlapTokens = options?.overlapTokens || 50

  const maxChars = maxTokens * CHARS_PER_TOKEN
  const overlapChars = overlapTokens * CHARS_PER_TOKEN

  if (!text || text.trim().length === 0) return []

  // If text is smaller than one chunk, return as single chunk
  if (text.length <= maxChars) {
    return [{
      content: text.trim(),
      chunk_index: 0,
      metadata: {},
    }]
  }

  const chunks: TextChunk[] = []
  let start = 0
  let chunkIndex = 0

  while (start < text.length) {
    const end = start + maxChars

    if (end >= text.length) {
      // Last chunk
      const content = text.slice(start).trim()
      if (content.length > 0) {
        chunks.push({ content, chunk_index: chunkIndex, metadata: {} })
      }
      break
    }

    // Try to break at a paragraph boundary first
    let breakPoint = findBreakPoint(text, end, start, '\n\n')
    if (breakPoint === -1) {
      // Try sentence boundary
      breakPoint = findBreakPoint(text, end, start, '. ')
      if (breakPoint !== -1) breakPoint += 1 // include the period
    }
    if (breakPoint === -1) {
      // Try newline
      breakPoint = findBreakPoint(text, end, start, '\n')
    }
    if (breakPoint === -1) {
      // Try space
      breakPoint = findBreakPoint(text, end, start, ' ')
    }
    if (breakPoint === -1) {
      // Force break at maxChars
      breakPoint = end
    }

    const content = text.slice(start, breakPoint).trim()
    if (content.length > 0) {
      chunks.push({ content, chunk_index: chunkIndex, metadata: {} })
      chunkIndex++
    }

    // Move start back by overlap
    start = Math.max(start + 1, breakPoint - overlapChars)
  }

  return chunks
}

/**
 * Find a break point near `target` position, searching backwards from target.
 * Only searches within the last 20% of the chunk to avoid tiny chunks.
 */
function findBreakPoint(
  text: string,
  target: number,
  chunkStart: number,
  delimiter: string
): number {
  const minSearchPos = chunkStart + Math.floor((target - chunkStart) * 0.8)
  const searchSlice = text.slice(minSearchPos, target)
  const lastIndex = searchSlice.lastIndexOf(delimiter)

  if (lastIndex === -1) return -1
  return minSearchPos + lastIndex + delimiter.length
}
