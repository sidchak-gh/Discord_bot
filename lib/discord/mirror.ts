
/**
 * Mirrors the same incident embed to the configured ops/mirror Discord channel
 * using a Discord channel webhook URL.
 *
 * Mirror is READ-ONLY — no action buttons attached.
 * Uses ?wait=true so we get an error if the webhook is invalid.
 */
export async function mirrorToDiscordChannel(
  mirrorWebhookUrl: string,
  embed: ReturnType<typeof import('./respond').buildIncidentEmbed>
): Promise<void> {
  const res = await fetch(`${mirrorWebhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [embed],
      // No components — mirror channel is read-only
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Mirror webhook failed: ${res.status} — ${err}`)
  }
}

/**
 * Posts a plain text update to the mirror channel (e.g. incident resolved).
 */
export async function mirrorTextUpdate(
  mirrorWebhookUrl: string,
  content: string
): Promise<void> {
  const res = await fetch(`${mirrorWebhookUrl}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Mirror text update failed: ${res.status} — ${err}`)
  }
}
