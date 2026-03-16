/**
 * GET /api/routines — list all saved routines for the current user (id, name, am, pm, is_current, updated_at).
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { SavedRoutineSummary } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = getSupabaseServer()

    if (!user) {
      return NextResponse.json([])
    }

    const { data: rows } = await supabase
      .from("routines")
      .select("id, name, am, pm, is_current, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (!rows || rows.length === 0) {
      return NextResponse.json([])
    }

    const list: SavedRoutineSummary[] = rows.map((r) => ({
      id: r.id,
      name: r.name ?? "My routine",
      am: Array.isArray(r.am) ? r.am : [],
      pm: Array.isArray(r.pm) ? r.pm : [],
      is_current: Boolean(r.is_current),
      updated_at: r.updated_at,
    }))
    return NextResponse.json(list)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routines failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load routines" },
      { status: 500 }
    )
  }
}
