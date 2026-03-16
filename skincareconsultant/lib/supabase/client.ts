/**
 * Supabase browser client (anon key). Safe for client-side.
 * Only creates client when env is set (e.g. build may run without env).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (typeof url !== "string" || !url || typeof anonKey !== "string" || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  _client = createClient(url, anonKey)
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getClient()[prop as keyof SupabaseClient]
  },
})
