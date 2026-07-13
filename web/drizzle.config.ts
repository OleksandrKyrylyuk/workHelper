import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/auth/schema.ts',
  out: '../api/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
