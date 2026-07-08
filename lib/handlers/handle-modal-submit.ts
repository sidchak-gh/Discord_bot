import { processIncident } from '@/lib/jobs/process-incident'
import { upsertServerConfig } from '@/lib/db/queries/server-configs'

/**
 * Handles the MODAL_SUBMIT interaction (type 5) from the /incident modal.
 *
 * Flow:
 * 1. Return DEFERRED immediately (within 1s) — required to stay under Discord 3s limit
 * 2. Fire background job async (does NOT await — job runs after response is sent)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleModalSubmit(body: any) {
  // Extract modal field values
  const components = body.data?.components as Array<{
    components: Array<{ custom_id: string; value: string }>
  }>

  const getValue = (id: string) =>
    components?.flatMap((row) => row.components).find((c) => c.custom_id === id)?.value ?? ''

  const title         = getValue('incident_title')
  const description   = getValue('incident_description')
  const affectedSystem = getValue('incident_system')

  const guildId    = body.guild_id as string
  const guildName  = body.guild?.name as string ?? 'Unknown Server'
  const userId     = body.member?.user?.id ?? body.user?.id
  const userTag    = body.member?.user?.username ?? body.user?.username ?? 'Unknown'
  const appId      = body.application_id as string
  const token      = body.token as string

  // Ensure server config exists (creates a blank row if first time)
  await upsertServerConfig(guildId, guildName, {})

  // Fire background job — intentionally NOT awaited
  // Response is already sent; this runs after
  processIncident({
    interactionId: body.id,
    guildId,
    userId,
    userTag,
    title,
    description,
    affectedSystem,
    applicationId: appId,
    token,
  }).catch((err) => console.error('[handleModalSubmit] Job error:', err))

  // Return DEFERRED immediately — type 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  return Response.json({ type: 5 })
}
