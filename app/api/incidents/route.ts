import { auth } from '@/lib/auth/config'
import { getAllIncidents } from '@/lib/db/queries/incidents'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const incidents = await getAllIncidents()
  return NextResponse.json(incidents)
}
