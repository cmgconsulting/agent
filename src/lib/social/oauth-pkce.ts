import crypto from 'crypto'

/**
 * Generate PKCE (Proof Key for Code Exchange) values for OAuth 2.0
 * Used by Twitter/X which requires PKCE for authorization
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate a random 43-128 character code verifier
  const codeVerifier = crypto.randomBytes(32).toString('base64url')

  // Create SHA-256 hash and base64url encode it
  const hash = crypto.createHash('sha256').update(codeVerifier).digest()
  const codeChallenge = hash.toString('base64url')

  return { codeVerifier, codeChallenge }
}
