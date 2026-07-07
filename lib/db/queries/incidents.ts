import { db } from '../client'
import { incidents, incidentEvents } from '../schema'
import { eq, and, desc } from 'drizzle-orm'

export type NewIncident = {
  interactionId: string
  guildId: string
  reportedById: string
  reportedByTag: string
  title: string
  description: string
  affectedSystem?: string
  severity: string
  aiSummary?: string
  aiReasoning?: string
}

export async function createIncident(data: NewIncident) {
  const [incident] = await db.insert(incidents).values(data).returning()
  return incident
}

export async function getOpenIncidents(guildId: string) {
  return db
    .select()
    .from(incidents)
    .where(and(eq(incidents.guildId, guildId), eq(incidents.status, 'open')))
    .orderBy(desc(incidents.createdAt))
}

export async function getAllIncidents(guildId?: string) {
  if (guildId) {
    return db
      .select()
      .from(incidents)
      .where(eq(incidents.guildId, guildId))
      .orderBy(desc(incidents.createdAt))
  }
  return db.select().from(incidents).orderBy(desc(incidents.createdAt))
}

export async function getIncidentById(id: number) {
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, id))
  return incident ?? null
}

export async function updateIncident(
  id: number,
  update: Partial<{
    status: string
    severity: string
    claimedById: string
    claimedByTag: string
    resolvedAt: Date
    discordMessageId: string
    discordChannelId: string
    aiSummary: string
    aiReasoning: string
  }>
) {
  const [updated] = await db
    .update(incidents)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(incidents.id, id))
    .returning()
  return updated
}

export async function logIncidentEvent(
  incidentId: number,
  eventType: string,
  actorId?: string,
  actorTag?: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(incidentEvents).values({
    incidentId,
    eventType,
    actorId,
    actorTag,
    metadata,
  })
}

export async function getIncidentEvents(incidentId: number) {
  return db
    .select()
    .from(incidentEvents)
    .where(eq(incidentEvents.incidentId, incidentId))
    .orderBy(incidentEvents.createdAt)
}
