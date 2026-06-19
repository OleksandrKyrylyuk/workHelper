import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/auth/schema'

const ADMIN_EMAIL = String(process.env.ADMIN_LOGIN)
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD)

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  const db = drizzle(pool, { schema })

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, ADMIN_EMAIL),
  })

  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`)
    await pool.end()
    return
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await db.insert(schema.users).values({
    email: ADMIN_EMAIL,
    name: 'Admin',
    password: hashed,
    role: 'admin',
  })

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
