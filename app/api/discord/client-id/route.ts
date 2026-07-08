import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    clientId: process.env.DISCORD_APPLICATION_ID || null,
  })
}
