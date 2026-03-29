import pg from "pg"
import { env } from "./env.js"

const { Pool } = pg

const useSsl = env.databaseUrl.includes("supabase.co")

export const db = new Pool({
  connectionString: env.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
})
