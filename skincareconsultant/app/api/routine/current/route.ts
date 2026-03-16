/**
 * PATCH /api/routine/current — set which routine is current. Body: { routineId: string }.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to set your current routine." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const routineId = typeof body.routineId === "string" ? body.routineId.trim() : null
    if (!routineId) {
      return NextResponse.json(
        { error: "routineId is required" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServer()
    const { data: routine } = await supabase
      .from("routines")
      .select("id")
      .eq("id", routineId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!routine) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      )
    }

    await supabase.from("routines").update({ is_current: false }).eq("user_id", user.id)
    const { error } = await supabase.from("routines").update({ is_current: true }).eq("id", routineId)
    if (error) {
      console.error("PATCH /api/routine/current failed", { error: error.message })
      return NextResponse.json({ error: "Failed to set current routine" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("PATCH /api/routine/current failed", { error: message })
    return NextResponse.json(
      { error: "Failed to set current routine" },
      { status: 500 }
    )
  }
}
