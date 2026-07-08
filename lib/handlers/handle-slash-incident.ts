import { buildIncidentModal } from '@/lib/discord/respond'

/**
 * Handles the /incident slash command.
 * Returns a MODAL immediately — no processing here, just the popup.
 * Discord type 9 = MODAL response.
 */
export function handleSlashIncident() {
  return Response.json(buildIncidentModal())
}
