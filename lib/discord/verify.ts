import { verifyKey } from 'discord-interactions'

/**
 * Verifies the Ed25519 signature on every incoming Discord interaction request.
 * MUST be called before any processing. Returns false for forged/invalid requests.
 *
 * IMPORTANT: rawBody must be the raw text string — NOT parsed JSON.
 * The signature is computed over the raw bytes, so parsing first breaks verification.
 */
export function verifyDiscordSignature(
  publicKey: string,
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) return false
  try {
    return verifyKey(rawBody, signature, timestamp, publicKey)
  } catch {
    return false
  }
}
