import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'
import { mirrorTextUpdate } from '@/lib/discord/mirror'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mirrorWebhookUrl } = await req.json()
  if (!mirrorWebhookUrl) return NextResponse.json({ error: 'mirrorWebhookUrl required' }, { status: 400 })

  try {
    await mirrorTextUpdate(mirrorWebhookUrl, '✅ **Test message** — Mirror channel is configured correctly! Incident notifications will appear here.')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
