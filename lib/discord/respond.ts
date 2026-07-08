// Severity color codes for Discord embeds
export const SEVERITY_COLORS: Record<string, number> = {
  P1: 0xff0000, // red
  P2: 0xff8c00, // orange
  P3: 0xffd700, // yellow
}

export const SEVERITY_EMOJI: Record<string, string> = {
  P1: '🔴',
  P2: '🟠',
  P3: '🟡',
}

export type Incident = {
  id: number
  title: string
  description: string
  affectedSystem: string | null
  reportedById: string
  reportedByTag: string
  severity: string
  aiSummary: string | null
  aiReasoning: string | null
  status: string
  claimedByTag: string | null
}

export type AIResult = {
  severity: string
  summary: string
  reasoning: string
}

/**
 * Builds the Discord embed for an incident card.
 * Used for both the main incidents channel post AND the mirror channel.
 */
export function buildIncidentEmbed(incident: Incident, ai: AIResult) {
  const emoji = SEVERITY_EMOJI[incident.severity] ?? '⚪'
  const color = SEVERITY_COLORS[incident.severity] ?? 0xaaaaaa

  return {
    title: `${emoji} INC-${incident.id}: ${incident.title}`,
    color,
    description: incident.description,
    fields: [
      {
        name: '🖥️ Affected System',
        value: incident.affectedSystem || 'Unknown',
        inline: true,
      },
      {
        name: '👤 Reported By',
        value: `<@${incident.reportedById}>`,
        inline: true,
      },
      {
        name: '📊 Severity',
        value: incident.severity,
        inline: true,
      },
      {
        name: '🤖 AI Summary',
        value: ai.summary || 'Processing...',
        inline: false,
      },
      {
        name: '🧠 AI Reasoning',
        value: ai.reasoning || 'N/A',
        inline: false,
      },
    ],
    footer: { text: `Status: OPEN • INC-${incident.id}` },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Builds the updated embed after status change (claimed/escalated/resolved).
 * Removes buttons from the message and updates footer.
 */
export function buildUpdatedEmbed(
  incident: Incident,
  ai: AIResult,
  newStatus: string,
  actorTag: string
) {
  const embed = buildIncidentEmbed(incident, ai)
  const statusLabels: Record<string, string> = {
    claimed: `CLAIMED by ${actorTag}`,
    resolved: `RESOLVED by ${actorTag}`,
    open: 'OPEN',
  }
  embed.footer = { text: `Status: ${statusLabels[newStatus] ?? newStatus} • INC-${incident.id}` }
  return embed
}

/**
 * Three action buttons placed under the incident card.
 * Claim, Escalate to P1, Resolve.
 */
export function buildIncidentButtons(incidentId: number) {
  return [
    {
      type: 1, // Action Row
      components: [
        {
          type: 2,
          style: 1, // Primary (blue)
          label: '🙋 Claim',
          custom_id: `claim_${incidentId}`,
        },
        {
          type: 2,
          style: 4, // Danger (red)
          label: '🔺 Escalate to P1',
          custom_id: `escalate_${incidentId}`,
        },
        {
          type: 2,
          style: 3, // Success (green)
          label: '✅ Resolve',
          custom_id: `resolve_${incidentId}`,
        },
      ],
    },
  ]
}

/**
 * The /incident modal response.
 * Discord type 9 = MODAL.
 */
export function buildIncidentModal() {
  return {
    type: 9,
    data: {
      custom_id: 'incident_modal',
      title: '🚨 Report an Incident',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4, // Text Input
              custom_id: 'incident_title',
              label: 'Incident Title',
              style: 1, // Short
              placeholder: 'e.g. API Gateway returning 503',
              required: true,
              max_length: 100,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'incident_description',
              label: 'What is happening?',
              style: 2, // Paragraph
              placeholder: 'Describe the issue and what you have already tried...',
              required: true,
              max_length: 1000,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'incident_system',
              label: 'Affected System',
              style: 1,
              placeholder: 'e.g. Payments, Auth, All',
              required: false,
              max_length: 100,
            },
          ],
        },
      ],
    },
  }
}

/**
 * Posts a message to a Discord channel using the bot token.
 */
export async function postToChannel(
  channelId: string,
  body: Record<string, unknown>
): Promise<{ id: string }> {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Discord post failed: ${res.status} — ${err}`)
  }
  return res.json()
}

/**
 * Edits an existing Discord message (used to update the incident card after button clicks).
 */
export async function editMessage(
  channelId: string,
  messageId: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Discord edit failed: ${res.status} — ${err}`)
  }
}

/**
 * Edits the deferred interaction follow-up response.
 * Called after the background job completes.
 */
export async function editDeferredResponse(
  applicationId: string,
  interactionToken: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Deferred edit failed: ${res.status} — ${err}`)
  }
}
