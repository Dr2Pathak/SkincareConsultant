import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForRefreshToken } from "@/lib/google-calendar-insert"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieState = request.cookies.get("gcal_oauth_state")?.value
  const uid = request.cookies.get("gcal_oauth_uid")?.value

  const fail = () => NextResponse.redirect(new URL("/routine/calendar?gcal=error", url.origin))

  if (!code || !state || !cookieState || state !== cookieState || !uid) {
    const res = fail()
    res.cookies.delete("gcal_oauth_state")
    res.cookies.delete("gcal_oauth_uid")
    return res
  }

  try {
    const refresh = await exchangeCodeForRefreshToken(code)
    const supabase = getSupabaseServer()
    const { error } = await supabase.from("profiles").upsert(
      {
        id: uid,
        google_calendar_refresh_token: refresh,
        google_calendar_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    if (error) {
      console.error("Google Calendar token save failed", { userId: uid, error: error.message })
      throw error
    }
    const res = NextResponse.redirect(new URL("/routine/calendar?gcal=connected", url.origin))
    res.cookies.delete("gcal_oauth_state")
    res.cookies.delete("gcal_oauth_uid")
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/calendar/google/oauth/callback failed", { error: message })
    const res = fail()
    res.cookies.delete("gcal_oauth_state")
    res.cookies.delete("gcal_oauth_uid")
    return res
  }
}
