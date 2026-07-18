/**
 * Get the authenticated user from a request's Authorization Bearer token.
 * Use in API routes to require or optional auth.
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Dev fallback when Supabase auth API is unreachable (e.g. TLS/proxy). Not used in production. */
function userIdFromJwt(token: string): string | null {
  try {
    const segment = token.split(".")[1]
    if (!segment) return null
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
    const pad = "=".repeat((4 - (padded.length % 4)) % 4)
    const payload = JSON.parse(Buffer.from(padded + pad, "base64").toString("utf8")) as {
      sub?: string
      exp?: number
    }
    if (typeof payload.sub !== "string" || !payload.sub) return null
    if (typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload.sub
  } catch {
    return null
  }
}

export async function getUserFromRequest(request: Request): Promise<{ id: string } | null> {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token || !url || !anonKey) return null
  const client = createClient(url, anonKey)
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token)
    if (!error && user?.id) return { id: user.id }
    if (error) {
      console.warn("getUserFromRequest: supabase rejected token", { message: error.message })
    }
  } catch (err) {
    console.warn("getUserFromRequest: supabase getUser failed", {
      error: err instanceof Error ? err.message : "unknown",
    })
  }

  if (process.env.NODE_ENV === "development") {
    const sub = userIdFromJwt(token)
    if (sub) return { id: sub }
  }

  return null
}
