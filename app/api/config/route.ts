import { auth } from '@/lib/auth/config'
import { upsertServerConfig, getAllServerConfigs, getServerConfig } from '@/lib/db/queries/server-configs'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const guildId = searchParams.get('guildId')

  if (guildId) {
    const config = await getServerConfig(guildId)
    return NextResponse.json(config)
  }

  const configs = await getAllServerConfigs()
  return NextResponse.json(configs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { guildId, guildName, incidentsChannel, mirrorWebhookUrl, p1RoleId, p2RoleId, autoSeverity } = body

  if (!guildId || !guildName) {
    return NextResponse.json({ error: 'guildId and guildName required' }, { status: 400 })
  }

  const config = await upsertServerConfig(guildId, guildName, {
    incidentsChannel,
    mirrorWebhookUrl,
    p1RoleId,
    p2RoleId,
    autoSeverity,
  })

  return NextResponse.json(config)
}

