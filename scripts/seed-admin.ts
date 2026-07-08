/**
 * One-time script to seed the first admin user.
 * Run this ONCE after deploying, then remove ADMIN_PASSWORD from env.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { adminUsers } from '../lib/db/schema'

const sql  = neon(process.env.DATABASE_URL!)
const db   = drizzle(sql)

async function main() {
  const email    = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)

  await db.insert(adminUsers).values({ email, passwordHash: hash }).onConflictDoUpdate({
    target: adminUsers.email,
    set: { passwordHash: hash },
  })

  console.log(`✅ Admin user seeded: ${email}`)
  console.log('You can now log in at /login')
  console.log('Delete ADMIN_PASSWORD from your env after seeding.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
