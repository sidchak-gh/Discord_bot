import { db } from '../client'
import { interactionLog } from '../schema'
import { eq } from 'drizzle-orm'

/**
 * Atomically checks if an interaction has been seen before, and if not, inserts it.
 * Uses a UNIQUE constraint on interaction_id — the DB itself is the lock.
 *
 * Returns true  → already processed (duplicate), caller should return early.
 * Returns false → brand new interaction, proceed with processing.
 */
export async function checkAndInsertInteractionId(
  interactionId: string,
  payload: unknown,
  meta?: {
    guildId?: string
    userId?: string
    commandName?: string
    interactionType?: number
  }
): Promise<boolean> {
  try {
    await db.insert(interactionLog).values({
      interactionId,
      rawPayload: payload as Record<string, unknown>,
      guildId:         meta?.guildId,
      userId:          meta?.userId,
      commandName:     meta?.commandName,
      interactionType: meta?.interactionType,
      status: 'pending',
    })
    return false // new interaction
  } catch (err: unknown) {
    // Postgres unique violation error code = 23505
    if (isUniqueViolation(err)) return true
    throw err // unexpected error — re-throw
  }
}

export async function updateInteractionLog(
  interactionId: string,
  update: { status: 'success' | 'failed'; errorMessage?: string; processingMs?: number }
) {
  await db
    .update(interactionLog)
    .set({
      status:       update.status,
      errorMessage: update.errorMessage,
      processingMs: update.processingMs,
    })
    .where(eq(interactionLog.interactionId, interactionId))
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}
