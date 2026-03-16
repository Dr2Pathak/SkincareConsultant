/**
 * Get the authenticated user from a request's Authorization Bearer token.
 * Use in API routes to require or optional auth.
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function getUserFromRequest(request: Request): Promise<{ id: string } | null> {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token || !url || !anonKey) return null
  const client = createClient(url, anonKey)
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token)
  if (error || !user?.id) return null
  return { id: user.id }
}
