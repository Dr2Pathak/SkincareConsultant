/**
 * Check that required env vars are set (from skincareconsultant/.env.local).
 * Run from repo root: npx tsx scripts/check-env.ts
 * Does not print secret values.
 */

import * as path from "path"
import { config } from "dotenv"

config({ path: path.join(__dirname, "..", "skincareconsultant", ".env.local") })

function check(name: string, value: string | undefined): "ok" | "missing" {
  const set = typeof value === "string" && value.trim().length > 0
  return set ? "ok" : "missing"
}

const checks: Record<string, "ok" | "missing"> = {
  "NEXT_PUBLIC_SUPABASE_URL": check("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": check("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  "SUPABASE_SERVICE_ROLE_KEY": check("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  "NEO4J_URI": check("NEO4J_URI", process.env.NEO4J_URI),
  "NEO4J_USER": check("NEO4J_USER", process.env.NEO4J_USER),
  "NEO4J_PASSWORD": check("NEO4J_PASSWORD", process.env.NEO4J_PASSWORD),
  "PINECONE_API_KEY": check("PINECONE_API_KEY", process.env.PINECONE_API_KEY),
  "PINECONE_INDEX_HOST or PINECONE_HOST": check("PINECONE_INDEX_HOST", process.env.PINECONE_INDEX_HOST ?? process.env.PINECONE_HOST),
  "GEMINI_API_KEY": check("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
}

const missing = Object.entries(checks).filter(([, v]) => v === "missing").map(([k]) => k)
const allOk = missing.length === 0

console.log("Env check (skincareconsultant/.env.local):")
Object.entries(checks).forEach(([key, status]) => {
  console.log(`  ${status === "ok" ? "✓" : "✗"} ${key}`)
})
if (missing.length > 0) {
  console.log("\nMissing:", missing.join(", "))
  console.log("Add them to skincareconsultant/.env.local (see .env.example).")
  process.exit(1)
}
console.log("\nAll keys present.")
process.exit(0)
