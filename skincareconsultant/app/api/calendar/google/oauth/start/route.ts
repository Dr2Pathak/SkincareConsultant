import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { createSupabaseServerClientFromCookies } from "@/lib/supabase/cookies-server"
import { getGoogleCalendarAuthUrl } from "@/lib/google-calendar-insert"

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  )
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClientFromCookies()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      const login = new URL("/login", appOrigin())
      login.searchParams.set("redirect", "/routine/calendar")
      return NextResponse.redirect(login)
    }

    const state = randomBytes(24).toString("hex")
    const authUrl = getGoogleCalendarAuthUrl(state)
    const res = NextResponse.redirect(authUrl)
    const secure = process.env.NODE_ENV === "production"
    res.cookies.set("gcal_oauth_state", state, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 600,
      secure,
    })
    res.cookies.set("gcal_oauth_uid", user.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 600,
      secure,
    })
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/calendar/google/oauth/start failed", { error: message })
    return NextResponse.json({ error: "Could not start Google connection" }, { status: 500 })
  }
}
