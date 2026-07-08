import { getIncidentById, updateIncident, logIncidentEvent } from '@/lib/db/queries/incidents'
import { getServerConfig } from '@/lib/db/queries/server-configs'
import { buildUpdatedEmbed, editMessage, editDeferredResponse } from '@/lib/discord/respond'
import { mirrorTextUpdate } from '@/lib/discord/mirror'
import { after } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleSlashResolve(body: any) {
  const incidentId = body.data?.options?.[0]?.value as number | undefined
  const userId     = body.member?.user?.id ?? body.user?.id
  const userTag    = body.member?.user?.username ?? body.user?.username ?? 'Unknown'
  const appId      = body.application_id as string
  const token      = body.token as string

  const deferredResponse = Response.json({ type: 5, data: { flags: 64 } })

  after(async () => {
    try {
      if (!incidentId) {
        await editDeferredResponse(appId, token, {
          content: '❌ Please provide an incident ID. Usage: `/resolve <incident_id>`',
          flags: 64,
        })
        return
      }

      const incident = await getIncidentById(incidentId)
      if (!incident) {
        await editDeferredResponse(appId, token, {
          content: `❌ Incident INC-${incidentId} not found.`,
          flags: 64,
        })
        return
      }

      if (incident.status === 'resolved') {
        await editDeferredResponse(appId, token, {
          content: `⚠️ INC-${incidentId} is already resolved.`,
          flags: 64,
        })
        return
      }

      await updateIncident(incidentId, { status: 'resolved', resolvedAt: new Date() })
      await logIncidentEvent(incidentId, 'resolved', userId, userTag, { via: 'slash_command' })

      const updated = await getIncidentById(incidentId)
      if (updated?.discordMessageId && updated?.discordChannelId) {
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
            'resolved',
            userTag
          )
          await editMessage(updated.discordChannelId, updated.discordMessageId, {
            embeds: [updatedEmbed],
            components: [],
          })
        } catch (err) {
          console.error('[Resolve] Failed to edit incident card:', err)
        }
      }

      const config = await getServerConfig(incident.guildId)
      if (config?.mirrorWebhookUrl) {
        try {
          await mirrorTextUpdate(
            config.mirrorWebhookUrl,
            `✅ **INC-${incidentId}** resolved by <@${userId}> via \`/resolve\`.`
          )
        } catch (err) {
          console.error('[Resolve] Mirror update failed:', err)
          await logIncidentEvent(incidentId, 'mirror_failed', undefined, undefined, {
            error: String(err),
          })
        }
      }

      await editDeferredResponse(appId, token, {
        content: `✅ **INC-${incidentId}** has been resolved.`,
        flags: 64,
      })
    } catch (err) {
      console.error('[handleSlashResolve] Error:', err)
      try {
        await editDeferredResponse(appId, token, {
          content: '❌ Something went wrong resolving the incident.',
          flags: 64,
        })
      } catch { /* ignore */ }
    }
  })

  return deferredResponse
}
