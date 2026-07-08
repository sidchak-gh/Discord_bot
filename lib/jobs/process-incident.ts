import { getServerConfig } from '../db/queries/server-configs'
import { createIncident, updateIncident, logIncidentEvent } from '../db/queries/incidents'
import { updateInteractionLog } from '../db/queries/interaction-log'
import { triageWithGemini } from '../ai/gemini'
import { buildIncidentEmbed, buildIncidentButtons, postToChannel, editDeferredResponse } from '../discord/respond'
import { mirrorToDiscordChannel } from '../discord/mirror'

/**
 * Background job that handles incident processing after the Discord response is deferred.
 * Every step is individually caught so that downstream failures do not stop the execution.
 */
export async function processIncident({
  interactionId,
  guildId,
  userId,
  userTag,
  title,
  description,
  affectedSystem,
  applicationId,
  token,
}: {
  interactionId: string
  guildId: string
  userId: string
  userTag: string
  title: string
  description: string
  affectedSystem: string
  applicationId: string
  token: string
}) {
  const startTime = Date.now()

  try {
    // Retrieve server configurations
    const config = await getServerConfig(guildId)

    // Triage using Gemini AI
    let aiResult = { severity: 'P3', summary: '', reasoning: '' }
    try {
      aiResult = await triageWithGemini({ title, description, affectedSystem })
    } catch (err) {
      console.error('[AI] Gemini triage failed:', err)
    }

    // Save incident to database
    const incident = await createIncident({
      interactionId,
      guildId,
      reportedById: userId,
      reportedByTag: userTag,
      title,
      description,
      affectedSystem: affectedSystem || undefined,
      severity: aiResult.severity,
      aiSummary: aiResult.summary || undefined,
      aiReasoning: aiResult.reasoning || undefined,
    })

    await logIncidentEvent(incident.id, 'created', userId, userTag, {
      severity: aiResult.severity,
      aiUsed: !!aiResult.summary,
    })

    if (!aiResult.summary) {
      await logIncidentEvent(incident.id, 'ai_failed', undefined, undefined, {
        fallback: 'P3',
      })
    }

    // Build the incident embed structure and responders buttons
    const embed = buildIncidentEmbed(
      {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        affectedSystem: incident.affectedSystem,
        reportedById: incident.reportedById,
        reportedByTag: incident.reportedByTag,
        severity: incident.severity,
        aiSummary: incident.aiSummary,
        aiReasoning: incident.aiReasoning,
        status: incident.status,
        claimedByTag: null,
      },
      {
        severity: aiResult.severity,
        summary: aiResult.summary,
        reasoning: aiResult.reasoning,
      }
    )
    const buttons = buildIncidentButtons(incident.id)

    // Post to the configured incidents channel
    if (config?.incidentsChannel) {
      try {
        const msg = await postToChannel(config.incidentsChannel, {
          embeds: [embed],
          components: buttons,
        })
        await updateIncident(incident.id, {
          discordMessageId: msg.id,
          discordChannelId: config.incidentsChannel,
        })
        await logIncidentEvent(incident.id, 'discord_posted', undefined, undefined, {
          messageId: msg.id,
          channelId: config.incidentsChannel,
        })
      } catch (err) {
        console.error('[Discord] Post to channel failed:', err)
        await logIncidentEvent(incident.id, 'discord_post_failed', undefined, undefined, {
          error: String(err),
        })
      }
    }

    // Mirror to secondary operations channel if webhook is set
    if (config?.mirrorWebhookUrl) {
      try {
        await mirrorToDiscordChannel(config.mirrorWebhookUrl, embed)
        await logIncidentEvent(incident.id, 'mirrored', undefined, undefined, {
          destination: 'discord_webhook',
        })
      } catch (err) {
        console.error('[Mirror] Discord webhook failed:', err)
        await logIncidentEvent(incident.id, 'mirror_failed', undefined, undefined, {
          error: String(err),
        })
      }
    }

    // Update the deferred response in Discord with the final incident ID
    try {
      await editDeferredResponse(applicationId, token, {
        content: `✅ **INC-${incident.id}** reported (${incident.severity}) — check <#${config?.incidentsChannel}> for the incident card.`,
        flags: 64,
      })
    } catch (err) {
      console.error('[Discord] Edit deferred response failed:', err)
    }

    // Update interaction status in observability logs
    await updateInteractionLog(interactionId, {
      status: 'success',
      processingMs: Date.now() - startTime,
    })
  } catch (err) {
    console.error('[Job] processIncident failed:', err)
    await updateInteractionLog(interactionId, {
      status: 'failed',
      errorMessage: String(err),
      processingMs: Date.now() - startTime,
    })

    try {
      await editDeferredResponse(applicationId, token, {
        content: '❌ Something went wrong creating the incident. Please try again.',
        flags: 64,
      })
    } catch {
      // ignore
    }
  }
}
