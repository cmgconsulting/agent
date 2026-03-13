// ============================================
// SECURITY UTILITIES — Rate limiting, input sanitization, validation
// ============================================

// ============================================
// RATE LIMITER (in-memory, per-instance)
// ============================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) rateLimitStore.delete(key)
  })
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number   // Max requests per window
  windowMs: number      // Window in milliseconds
}

export const RATE_LIMITS = {
  // Agent execution: 20 per minute per user
  agentRun: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,
  // API general: 60 per minute per user
  api: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
  // Webhooks: 100 per minute per IP
  webhook: { maxRequests: 100, windowMs: 60_000 } as RateLimitConfig,
  // Auth: 10 per minute per IP
  auth: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  // Export: 5 per minute per user
  export: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
}

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetAt - now }
}

export function rateLimitResponse(resetIn: number) {
  return new Response(JSON.stringify({ error: 'Trop de requetes. Reessayez plus tard.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.ceil(resetIn / 1000)),
    },
  })
}


// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize a string to prevent XSS and injection attacks.
 * Removes HTML tags, script tags, and normalizes whitespace.
 */
export function sanitizeString(input: string, maxLength = 10_000): string {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

/**
 * Validate and sanitize a UUID string
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

/**
 * Validate phone number (French format or international)
 */
export function isValidPhone(phone: string): boolean {
  return /^(\+?\d{1,4}[\s-]?)?(\d[\s-]?){6,14}\d$/.test(phone)
}

/**
 * Validate SIRET number (14 digits)
 */
export function isValidSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret.replace(/\s/g, ''))
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T, maxDepth = 5): T {
  if (maxDepth <= 0) return obj
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    const val = result[key]
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(val)
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(val as Record<string, unknown>, maxDepth - 1)
    }
  }
  return result
}


// ============================================
// REQUEST VALIDATION HELPERS
// ============================================

/**
 * Validate a JSON body size (prevent massive payloads)
 */
export function validateBodySize(body: string | unknown, maxBytes = 1_000_000): boolean {
  const size = typeof body === 'string' ? body.length : JSON.stringify(body).length
  return size <= maxBytes
}

/**
 * Validate required fields in a request body
 */
export function validateRequired(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return `Le champ '${field}' est requis`
    }
  }
  return null
}


// ============================================
// SECURITY HEADERS
// ============================================

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * Add security headers to a response
 */
export function withSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}


// ============================================
// CSRF / ORIGIN CHECK
// ============================================

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Allow requests with no origin (same-origin, server-side)
  if (!origin) return true

  // Check against known app URL
  const allowedOrigins = [appUrl, 'https://cmg-agents.vercel.app']
  return allowedOrigins.some(allowed => origin.startsWith(allowed))
}
