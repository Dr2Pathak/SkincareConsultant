import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { Routine, RoutineStep } from "@/lib/types"
import { buildRoutineSchedule } from "@/lib/routine-schedule"

type PreviewBody = {
  routineId?: string
  includeAm?: boolean
  includePm?: boolean
  includeWeekly?: boolean
  horizonDays?: number
  amTime?: string
  pmTime?: string
  weeklyDays?: string[]
  weeklyTime?: string
}

const DEFAULT_NAME = "My routine"

async function loadRoutineForUser(
  userId: string,
  routineId?: string,
): Promise<Routine> {
  const supabase = getSupabaseServer()

  if (routineId) {
    const { data } = await supabase
      .from("routines")
      .select("id, name, am, pm")
      .eq("id", routineId)
      .eq("user_id", userId)
      .maybeSingle()
    if (data) {
      return {
        id: data.id,
        name: data.name ?? DEFAULT_NAME,
        am: (Array.isArray(data.am) ? data.am : []) as RoutineStep[],
        pm: (Array.isArray(data.pm) ? data.pm : []) as RoutineStep[],
      }
    }
  }

  const { data: current } = await supabase
    .from("routines")
    .select("id, name, am, pm")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle()

  if (current) {
    return {
      id: current.id,
      name: current.name ?? DEFAULT_NAME,
      am: (Array.isArray(current.am) ? current.am : []) as RoutineStep[],
      pm: (Array.isArray(current.pm) ? current.pm : []) as RoutineStep[],
    }
  }

  const { data: latest } = await supabase
    .from("routines")
    .select("id, name, am, pm")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest) {
    return {
      id: latest.id,
      name: latest.name ?? DEFAULT_NAME,
      am: (Array.isArray(latest.am) ? latest.am : []) as RoutineStep[],
      pm: (Array.isArray(latest.pm) ? latest.pm : []) as RoutineStep[],
    }
  }

  return { am: [], pm: [] }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to preview your routine schedule." },
        { status: 401 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as PreviewBody
    const routine = await loadRoutineForUser(user.id, body.routineId)

    const includeAm = body.includeAm ?? true
    const includePm = body.includePm ?? true
    const includeWeekly = body.includeWeekly ?? false
    const horizonDays = body.horizonDays && body.horizonDays > 0 ? body.horizonDays : 30

    const events = buildRoutineSchedule(
      routine,
      {
        amTime: body.amTime,
        pmTime: body.pmTime,
        weeklyDays: body.weeklyDays,
        weeklyTime: body.weeklyTime,
      },
      { includeAm, includePm, includeWeekly },
      { horizonDays },
    )

    return NextResponse.json({ events })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/routine-schedule/preview failed", { error: message })
    return NextResponse.json(
      { error: "Failed to build routine schedule preview" },
      { status: 500 },
    )
  }
}

