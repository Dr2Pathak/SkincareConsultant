/**
 * GET /api/routine-calendar-bootstrap
 *
 * Returns all persisted data needed for the routine calendar initial render:
 * - saved routines list (AM/PM + is_current)
 * - schedule overrides map (date -> routineId)
 * - defaultRoutineId (current routine if present, else most recently updated)
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { SavedRoutineSummary } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({
        defaultRoutineId: null as string | null,
        savedRoutines: [] as SavedRoutineSummary[],
        overrides: {} as Record<string, string>,
      })
    }

    const supabase = getSupabaseServer()

    // Fetch routines once; derive default routine from is_current or recency.
    const { data: routineRows } = await supabase
      .from("routines")
      .select("id, name, am, pm, is_current, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    const savedRoutines: SavedRoutineSummary[] = Array.isArray(routineRows)
      ? routineRows.map((r) => ({
          id: r.id,
          name: r.name ?? "My routine",
          am: Array.isArray(r.am) ? (r.am as SavedRoutineSummary["am"]) : [],
          pm: Array.isArray(r.pm) ? (r.pm as SavedRoutineSummary["pm"]) : [],
          is_current: Boolean(r.is_current),
          updated_at: r.updated_at,
        }))
      : []

    const defaultRoutineId =
      savedRoutines.find((r) => r.is_current)?.id ?? savedRoutines[0]?.id ?? null

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("schedule_overrides")
      .eq("id", user.id)
      .maybeSingle()

    const overrides = (profileRow?.schedule_overrides ?? {}) as Record<string, string>

    return NextResponse.json({
      defaultRoutineId,
      savedRoutines,
      overrides,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routine-calendar-bootstrap failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load calendar data" },
      { status: 500 },
    )
  }
}

