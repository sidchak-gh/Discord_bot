import { verifyDiscordSignature } from '@/lib/discord/verify'
import { checkAndInsertInteractionId } from '@/lib/db/queries/interaction-log'
import { handleSlashIncident } from '@/lib/handlers/handle-slash-incident'
import { handleSlashStatus } from '@/lib/handlers/handle-slash-status'
import { handleSlashResolve } from '@/lib/handlers/handle-slash-resolve'
import { handleModalSubmit } from '@/lib/handlers/handle-modal-submit'
import { handleButton } from '@/lib/handlers/handle-button'

export const runtime = 'nodejs'

/**
 * Discord interactions webhook endpoint.
 */
export async function POST(req: Request) {
  // Read raw body as text — signature verification requires the raw bytes
  const rawBody  = await req.text()
  const signature = req.headers.get('x-signature-ed25519')
  const timestamp  = req.headers.get('x-signature-timestamp')

  // Verify Ed25519 signature
  const isValid = await verifyDiscordSignature(
    process.env.DISCORD_PUBLIC_KEY!,
    rawBody,
    signature,
    timestamp
  )
  if (!isValid) {
    console.warn('[Interactions] Invalid signature rejected')
    return new Response('Unauthorized', { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = JSON.parse(rawBody) as any

  // Handle Discord endpoint verification PING
  if (body.type === 1) {
    return Response.json({ type: 1 })
  }

  // Deduplicate using unique constraint on interaction_id
  const guildId    = body.guild_id as string | undefined
  const userId     = body.member?.user?.id ?? body.user?.id
  const commandName = body.data?.name ?? body.data?.custom_id

  const alreadySeen = await checkAndInsertInteractionId(body.id, body, {
    guildId,
    userId,
    commandName,
    interactionType: body.type,
  })

  if (alreadySeen) {
    console.info('[Interactions] Duplicate interaction skipped:', body.id)
    return Response.json({ type: 1 })
  }

  // ── Step 5: Route by interaction type ─────────────────────────────────────
  switch (body.type) {
    case 2: {
      // APPLICATION_COMMAND — slash commands
      const commandName = body.data?.name as string
      switch (commandName) {
        case 'incident': return handleSlashIncident()
        case 'status':   return await handleSlashStatus(body)
        case 'resolve':  return await handleSlashResolve(body)
        default:
          return Response.json({
            type: 4,
            data: { content: `Unknown command: /${commandName}`, flags: 64 },
          })
      }
    }

    case 3: {
      // MESSAGE_COMPONENT — button/select menu clicks
      return await handleButton(body)
    }

    case 5: {
      // MODAL_SUBMIT — form submitted from a modal
      return await handleModalSubmit(body)
    }

    default:
      return new Response('Unknown interaction type', { status: 400 })
  }
}
