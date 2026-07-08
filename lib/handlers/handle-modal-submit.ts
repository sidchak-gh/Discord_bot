import { processIncident } from '@/lib/jobs/process-incident'
import { upsertServerConfig } from '@/lib/db/queries/server-configs'
import { after } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleModalSubmit(body: any) {
  const components = body.data?.components as Array<{
    components: Array<{ custom_id: string; value: string }>
  }>

  const getValue = (id: string) =>
    components?.flatMap((row) => row.components).find((c) => c.custom_id === id)?.value ?? ''

  const title         = getValue('incident_title')
  const description   = getValue('incident_description')
  const affectedSystem = getValue('incident_system')

  const guildId    = body.guild_id as string
  const guildName  = body.guild?.name as string ?? 'Unknown Server'
  const userId     = body.member?.user?.id ?? body.user?.id
  const userTag    = body.member?.user?.username ?? body.user?.username ?? 'Unknown'
  const appId      = body.application_id as string
  const token      = body.token as string

  await upsertServerConfig(guildId, guildName, {})

  after(async () => {
    try {
      await processIncident({
        interactionId: body.id,
        guildId,
        userId,
        userTag,
        title,
        description,
        affectedSystem,
        applicationId: appId,
        token,
      })
    } catch (err) {
      console.error('[handleModalSubmit] Job error:', err)
    }
  })

  return Response.json({ type: 5 })
}
