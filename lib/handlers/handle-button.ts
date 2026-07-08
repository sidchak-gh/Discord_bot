import { getIncidentById, updateIncident, logIncidentEvent } from '@/lib/db/queries/incidents'
import { getServerConfig } from '@/lib/db/queries/server-configs'
import { buildUpdatedEmbed, editMessage, editDeferredResponse } from '@/lib/discord/respond'
import { mirrorTextUpdate } from '@/lib/discord/mirror'

/**
 * Handles button clicks (interaction type 3 = MESSAGE_COMPONENT).
 * Supported buttons: claim_{id}, escalate_{id}, resolve_{id}
 *
 * Flow:
 * 1. Return DEFERRED immediately
 * 2. Parse custom_id to get action + incident ID
 * 3. Update DB
 * 4. Edit the original incident card in Discord
 * 5. Post text update to mirror channel
 * 6. Follow up the deferred response ephemerally
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleButton(body: any) {
  const customId: string = body.data?.custom_id ?? ''
  const userId   = body.member?.user?.id ?? body.user?.id
  const userTag  = body.member?.user?.username ?? body.user?.username ?? 'Unknown'
  const appId    = body.application_id as string
  const token    = body.token as string

  // Parse: "claim_42", "escalate_42", "resolve_42"
  const [action, incidentIdStr] = customId.split('_')
  const incidentId = parseInt(incidentIdStr, 10)

  // Return DEFERRED immediately before doing any work
  const deferredResponse = Response.json({
    type: 6, // DEFERRED_UPDATE_MESSAGE — silently defers, doesn't show "thinking"
  })

  // Handle button action asynchronously
  ;(async () => {
    try {
      const incident = await getIncidentById(incidentId)
      if (!incident) return

      const config = await getServerConfig(incident.guildId)
      let newStatus = incident.status
      let replyText = ''

      if (action === 'claim') {
        if (incident.status !== 'open') {
          await editDeferredResponse(appId, token, {
            content: `⚠️ INC-${incidentId} is already ${incident.status}.`,
            flags: 64,
          })
          return
        }
        newStatus = 'claimed'
        await updateIncident(incidentId, { status: 'claimed', claimedById: userId, claimedByTag: userTag })
        await logIncidentEvent(incidentId, 'claimed', userId, userTag)
        replyText = `🙋 **INC-${incidentId}** has been claimed by <@${userId}>.`

      } else if (action === 'escalate') {
        await updateIncident(incidentId, { severity: 'P1' })
        await logIncidentEvent(incidentId, 'escalated', userId, userTag, { from: incident.severity, to: 'P1' })
        replyText = `🔺 **INC-${incidentId}** escalated to **P1** by <@${userId}>.`

      } else if (action === 'resolve') {
        newStatus = 'resolved'
        await updateIncident(incidentId, { status: 'resolved', resolvedAt: new Date() })
        await logIncidentEvent(incidentId, 'resolved', userId, userTag)
        replyText = `✅ **INC-${incidentId}** resolved by <@${userId}>.`
      }

      // Fetch updated incident
      const updated = await getIncidentById(incidentId)
      if (!updated) return

      // Edit the original incident card — update embed, remove buttons
      if (updated.discordMessageId && updated.discordChannelId) {
        try {
          const updatedEmbed = buildUpdatedEmbed(
            {
              id: updated.id,
              title: updated.title,
              description: updated.description,
              affectedSystem: updated.affectedSystem,
              reportedById: updated.reportedById,
              reportedByTag: updated.reportedByTag,
              severity: updated.severity,
              aiSummary: updated.aiSummary,
              aiReasoning: updated.aiReasoning,
              status: updated.status,
              claimedByTag: updated.claimedByTag,
            },
            {
              severity: updated.severity,
              summary: updated.aiSummary ?? '',
              reasoning: updated.aiReasoning ?? '',
            },
            newStatus,
            userTag
          )
          await editMessage(updated.discordChannelId, updated.discordMessageId, {
            embeds: [updatedEmbed],
            components: [], // Remove buttons after action
          })
        } catch (err) {
          console.error('[Button] Failed to edit incident card:', err)
        }
      }

      // Mirror update to second channel
      if (config?.mirrorWebhookUrl && replyText) {
        try {
          await mirrorTextUpdate(config.mirrorWebhookUrl, replyText)
        } catch (err) {
          console.error('[Button] Mirror update failed:', err)
          await logIncidentEvent(incidentId, 'mirror_failed', undefined, undefined, { error: String(err) })
        }
      }

      // Ephemeral confirmation to the user who clicked
      await editDeferredResponse(appId, token, {
        content: replyText || `✅ Action completed on INC-${incidentId}.`,
        flags: 64,
      })
    } catch (err) {
      console.error('[handleButton] Error:', err)
      try {
        await editDeferredResponse(appId, token, {
          content: '❌ Something went wrong. Please try again.',
          flags: 64,
        })
      } catch { /* ignore */ }
    }
  })().catch(console.error)

  return deferredResponse
}
