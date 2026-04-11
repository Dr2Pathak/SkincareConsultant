/**
 * GET /api/routine-calendar-bootstrap
 *
 * Returns all persisted data needed for the routine calendar initial render:
 * - saved routines list (AM/PM + is_current)
 * - schedule overrides map (date -> routineId)
 * - defaultRoutineId (current routine if present, else most recently updated)
 */

import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { loadCalendarBootstrapForUser } from "@/lib/calendar-bootstrap-data"
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

    const { defaultRoutineId, savedRoutines, overrides } = await loadCalendarBootstrapForUser(user.id)

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

