import { getOpenIncidents } from '@/lib/db/queries/incidents'
import { SEVERITY_EMOJI, SEVERITY_COLORS } from '@/lib/discord/respond'

/**
 * Handles the /status command.
 * Queries open incidents for this guild and returns a formatted embed.
 * No deferral needed — DB query is fast enough.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleSlashStatus(body: any) {
  const guildId: string = body.guild_id

  const openIncidents = await getOpenIncidents(guildId)

  if (openIncidents.length === 0) {
    return Response.json({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        embeds: [
          {
            title: '✅ No Open Incidents',
            color: 0x2ecc71,
            description: 'All systems are operational.',
            timestamp: new Date().toISOString(),
          },
        ],
        flags: 64, // Ephemeral
      },
    })
  }

  const fields = openIncidents.slice(0, 10).map((inc) => ({
    name: `${SEVERITY_EMOJI[inc.severity] ?? '⚪'} INC-${inc.id} (${inc.severity})`,
    value: `**${inc.title}**\nReported by ${inc.reportedByTag} • ${timeAgo(inc.createdAt!)}`,
    inline: false,
  }))

  return Response.json({
    type: 4,
    data: {
      embeds: [
        {
          title: `🚨 Open Incidents (${openIncidents.length})`,
          color: openIncidents.some((i) => i.severity === 'P1')
            ? SEVERITY_COLORS.P1
            : openIncidents.some((i) => i.severity === 'P2')
              ? SEVERITY_COLORS.P2
              : SEVERITY_COLORS.P3,
          fields,
          footer: { text: 'Use /resolve <id> to close an incident' },
          timestamp: new Date().toISOString(),
        },
      ],
      flags: 64,
    },
  })
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
