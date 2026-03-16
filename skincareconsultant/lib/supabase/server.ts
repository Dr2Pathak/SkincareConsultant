/**
 * Supabase server client (service role). Use only in API routes or server components.
 * Never expose service role key to the client.
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getSupabaseServer() {
  if (typeof url !== "string" || typeof serviceRoleKey !== "string") {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
