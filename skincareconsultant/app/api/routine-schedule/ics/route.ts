import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { Routine, RoutineStep } from "@/lib/types"
import { buildRoutineSchedule } from "@/lib/routine-schedule"

type IcsBody = {
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

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to export your routine schedule." },
        { status: 401 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as IcsBody
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

    const now = new Date()
    const timestamp =
      now.getUTCFullYear().toString() +
      String(now.getUTCMonth() + 1).padStart(2, "0") +
      String(now.getUTCDate()).padStart(2, "0") +
      "T" +
      String(now.getUTCHours()).padStart(2, "0") +
      String(now.getUTCMinutes()).padStart(2, "0") +
      String(now.getUTCSeconds()).padStart(2, "0") +
      "Z"

    const lines: string[] = []
    lines.push("BEGIN:VCALENDAR")
    lines.push("VERSION:2.0")
    lines.push("PRODID:-//Skincare Consultant//Routine Schedule//EN")

    for (const evt of events) {
      const [hourStr, minuteStr] = evt.time.split(":")
      const [y, m, d] = evt.date.split("-")
      const dt = `${y}${m}${d}T${(hourStr || "07").padStart(2, "0")}${(minuteStr || "00").padStart(2, "0")}00`
      const uid = `${evt.id}@skincare-consultant`
      const summary = escapeIcsText(evt.label)
      const descriptionParts: string[] = []
      if (evt.products.length > 0) {
        descriptionParts.push(
          "Products: " +
            evt.products
              .map((p) => `${p.brand ? `${p.brand} ` : ""}${p.name}`)
              .join(", "),
        )
      }
      if (evt.tags.length > 0) {
        descriptionParts.push("Tags: " + evt.tags.join(", "))
      }
      const description = escapeIcsText(descriptionParts.join("\\n"))

      lines.push("BEGIN:VEVENT")
      lines.push(`UID:${uid}`)
      lines.push(`DTSTAMP:${timestamp}`)
      lines.push(`DTSTART:${dt}`)
      lines.push(`SUMMARY:${summary}`)
      if (description) {
        lines.push(`DESCRIPTION:${description}`)
      }
      lines.push("END:VEVENT")
    }

    lines.push("END:VCALENDAR")

    const icsText = lines.join("\r\n")
    const filename = `skincare-routine-${routine.name ? routine.name.replace(/\s+/g, "-").toLowerCase() : "schedule"}.ics`

    return new NextResponse(icsText, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/routine-schedule/ics failed", { error: message })
    return NextResponse.json(
      { error: "Failed to export routine schedule as calendar" },
      { status: 500 },
    )
  }
}

