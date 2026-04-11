import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ connected: false })
    }
    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from("profiles")
      .select("google_calendar_refresh_token")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error("GET /api/calendar/google/status failed", { userId: user.id, error: error.message })
      return NextResponse.json({ connected: false })
    }

    const token = data?.google_calendar_refresh_token
    return NextResponse.json({ connected: typeof token === "string" && token.length > 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/calendar/google/status failed", { error: message })
    return NextResponse.json({ connected: false })
  }
}
