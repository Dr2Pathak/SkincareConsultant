/**
 * Server-safe access token for API calls. Set by AuthProvider from Supabase session.
 * Used by api.ts to send Authorization header when saving routine.
 */

let accessToken: string | null = null

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}
