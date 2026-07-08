import { db } from '../client'
import { serverConfigs } from '../schema'
import { eq } from 'drizzle-orm'

export async function getServerConfig(guildId: string) {
  const [config] = await db
    .select()
    .from(serverConfigs)
    .where(eq(serverConfigs.guildId, guildId))
  return config ?? null
}

export async function upsertServerConfig(
  guildId: string,
  guildName: string,
  update: Partial<{
    incidentsChannel: string
    mirrorWebhookUrl: string
    p1RoleId: string
    p2RoleId: string
    autoSeverity: boolean
  }>
) {
  const [config] = await db
    .insert(serverConfigs)
    .values({ guildId, guildName, ...update })
    .onConflictDoUpdate({
      target: serverConfigs.guildId,
      set: { ...update, updatedAt: new Date() },
    })
    .returning()
  return config
}

export async function getAllServerConfigs() {
  return db.select().from(serverConfigs)
}
