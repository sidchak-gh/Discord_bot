/**
 * One-time script to register slash commands with Discord.
 * Run this once after setting up your Discord app.
 *
 * Usage:
 *   npx tsx scripts/register-commands.ts
 *
 * Uses global registration (works in all servers).
 * Takes up to 1 hour to propagate globally.
 * For faster testing during dev, set DISCORD_GUILD_ID to register guild-only (instant).
 */

import 'dotenv/config'

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID!
const BOT_TOKEN      = process.env.DISCORD_BOT_TOKEN!
const GUILD_ID       = process.env.DISCORD_GUILD_ID  // optional — for guild-specific (instant) registration

const commands = [
  {
    name: 'incident',
    description: 'Report a new incident to the team',
    type: 1, // CHAT_INPUT
  },
  {
    name: 'status',
    description: 'View all currently open incidents for this server',
    type: 1,
  },
  {
    name: 'resolve',
    description: 'Mark an incident as resolved',
    type: 1,
    options: [
      {
        name: 'incident_id',
        description: 'The incident ID to resolve (e.g. 42)',
        type: 4, // INTEGER
        required: true,
      },
    ],
  },
]

async function registerCommands() {
  // Use guild registration if DISCORD_GUILD_ID is set (instant, good for dev)
  // Otherwise use global registration (up to 1h to propagate, good for prod)
  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`

  console.log(`Registering ${commands.length} commands...`)
  console.log(`Scope: ${GUILD_ID ? `Guild (${GUILD_ID})` : 'Global'}`)
  console.log(`URL: ${url}`)

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('❌ Failed to register commands:', res.status, err)
    process.exit(1)
  }

  const registered = await res.json()
  console.log('✅ Commands registered successfully:')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registered.forEach((cmd: any) => console.log(`  /${cmd.name} (id: ${cmd.id})`))
}

registerCommands().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
