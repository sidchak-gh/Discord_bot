import { getIncidentById, updateIncident, logIncidentEvent } from '@/lib/db/queries/incidents'
import { getServerConfig } from '@/lib/db/queries/server-configs'
import { buildUpdatedEmbed, editMessage, editDeferredResponse } from '@/lib/discord/respond'
import { mirrorTextUpdate } from '@/lib/discord/mirror'
import { after } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleButton(body: any) {
  const customId: string = body.data?.custom_id ?? ''
  const userId   = body.member?.user?.id ?? body.user?.id
  const userTag  = body.member?.user?.username ?? body.user?.username ?? 'Unknown'
  const appId    = body.application_id as string
  const token    = body.token as string

  const [action, incidentIdStr] = customId.split('_')
  const incidentId = parseInt(incidentIdStr, 10)

  const deferredResponse = Response.json({
    type: 6,
  })

  after(async () => {
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

      const updated = await getIncidentById(incidentId)
      if (!updated) return

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
            components: [],
          })
        } catch (err) {
          console.error('[Button] Failed to edit incident card:', err)
        }
      }

      if (config?.mirrorWebhookUrl && replyText) {
        try {
          await mirrorTextUpdate(config.mirrorWebhookUrl, replyText)
        } catch (err) {
          console.error('[Button] Mirror update failed:', err)
          await logIncidentEvent(incidentId, 'mirror_failed', undefined, undefined, { error: String(err) })
        }
      }

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
  })

  return deferredResponse
}
