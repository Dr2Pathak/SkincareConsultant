/**
 * Supabase browser client (anon key). Uses @supabase/ssr so the session is stored in cookies
 * and visible to middleware for route protection.
 */

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (typeof url !== "string" || !url || typeof anonKey !== "string" || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  return createBrowserClient(url, anonKey)
}

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) _client = createClient()
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})
