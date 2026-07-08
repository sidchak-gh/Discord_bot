import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

/**
 * Cached DB client instance.
 */
let dbInstance: ReturnType<typeof createDbClient> | null = null

function createDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return drizzle(pool, { schema })
}

function getDb() {
  if (!dbInstance) {
    dbInstance = createDbClient()
  }
  return dbInstance
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>]
  },
})
