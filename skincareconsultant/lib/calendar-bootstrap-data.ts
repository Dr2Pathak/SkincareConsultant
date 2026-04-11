/**
 * Shared loader for routine list + schedule overrides (used by calendar bootstrap API and Google sync).
 */

import { getSupabaseServer } from "@/lib/supabase/server"
import type { SavedRoutineSummary } from "@/lib/types"

export type CalendarBootstrapData = {
  defaultRoutineId: string | null
  savedRoutines: SavedRoutineSummary[]
  overrides: Record<string, string>
}

export async function loadCalendarBootstrapForUser(userId: string): Promise<CalendarBootstrapData> {
  const supabase = getSupabaseServer()

  const { data: routineRows } = await supabase
    .from("routines")
    .select("id, name, am, pm, is_current, updated_at")
    .eq("user_id", userId)
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

  const defaultRoutineId = savedRoutines.find((r) => r.is_current)?.id ?? savedRoutines[0]?.id ?? null

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("schedule_overrides")
    .eq("id", userId)
    .maybeSingle()

  const overrides = (profileRow?.schedule_overrides ?? {}) as Record<string, string>

  return { defaultRoutineId, savedRoutines, overrides }
}
