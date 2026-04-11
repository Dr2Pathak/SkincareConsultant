/**
 * POST /api/calendar/google/sync — Tree-of-Thoughts interpretation + buildRoutineSchedule-derived events → Google Calendar.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { loadCalendarBootstrapForUser } from "@/lib/calendar-bootstrap-data"
import { buildCalendarBuckets, flattenBucketEvents } from "@/lib/calendar-buckets"
import type { RoutineSchedulePrefs } from "@/lib/routine-schedule"
import { interpretCalendarRequestWithTot } from "@/lib/calendar-ai-tot"
import { insertRoutineEventsToGoogleCalendar } from "@/lib/google-calendar-insert"
import { getChatEnvError } from "@/lib/env"

const MAX_HORIZON = 42

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  includeAm: z.boolean().optional(),
  includePm: z.boolean().optional(),
  includeWeekly: z.boolean().optional(),
  amTime: z.string().optional(),
  pmTime: z.string().optional(),
  weeklyTime: z.string().optional(),
  weeklyDays: z.array(z.string()).optional(),
  timeZone: z.string().max(80).optional(),
  maxHorizonDays: z.number().int().min(1).max(MAX_HORIZON).optional(),
})

export async function POST(request: Request) {
  const envError = getChatEnvError()
  if (envError) {
    return NextResponse.json({ error: envError }, { status: 503 })
  }

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google Calendar is not configured (missing OAuth env vars)." },
      { status: 503 },
    )
  }

  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const supabase = getSupabaseServer()

    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("google_calendar_refresh_token, calendar_time_zone")
      .eq("id", user.id)
      .maybeSingle()

    if (profileErr) {
      console.error("sync profile load failed", { userId: user.id, error: profileErr.message })
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 })
    }

    const refreshToken = profileRow?.google_calendar_refresh_token as string | null | undefined
    if (!refreshToken) {
      return NextResponse.json({ error: "Google Calendar not connected", needsGoogleLink: true }, { status: 400 })
    }

    const { defaultRoutineId, savedRoutines, overrides } = await loadCalendarBootstrapForUser(user.id)
    const routineSummaries = savedRoutines.map((r) => ({ id: r.id, name: r.name }))
    const cap = Math.min(MAX_HORIZON, body.maxHorizonDays ?? MAX_HORIZON)

    const tot = await interpretCalendarRequestWithTot(body.message, {
      defaultRoutineId,
      savedRoutines: routineSummaries,
      maxHorizonDays: cap,
    })

    if (!tot.ok) {
      return NextResponse.json({ error: tot.message, clarifying: true }, { status: 400 })
    }

    const { horizonDays, scope, effectiveDefaultRoutineId } = tot.data

    const prefs: RoutineSchedulePrefs = {
      amTime: body.amTime,
      pmTime: body.pmTime,
      weeklyTime: body.weeklyTime,
      weeklyDays: body.weeklyDays,
    }

    const mergedScope = {
      includeAm: scope.includeAm && (body.includeAm !== false),
      includePm: scope.includePm && (body.includePm !== false),
      includeWeekly: scope.includeWeekly && (body.includeWeekly !== false),
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const buckets = buildCalendarBuckets({
      defaultRoutineId: effectiveDefaultRoutineId,
      savedRoutines,
      overrides,
      horizonDays,
      scope: mergedScope,
      prefs,
      startDate: start,
    })

    const events = flattenBucketEvents(buckets)
    if (events.length === 0) {
      return NextResponse.json(
        {
          error:
            "No events to sync. Add steps to your routine or enable AM/PM/weekly in the calendar view, then try again.",
          created: 0,
        },
        { status: 400 },
      )
    }

    const tz =
      body.timeZone ||
      (typeof profileRow?.calendar_time_zone === "string" ? profileRow.calendar_time_zone : "") ||
      "UTC"

    if (body.timeZone && body.timeZone.length > 1) {
      await supabase
        .from("profiles")
        .update({ calendar_time_zone: body.timeZone, updated_at: new Date().toISOString() })
        .eq("id", user.id)
    }

    const { created, errors } = await insertRoutineEventsToGoogleCalendar(refreshToken, events, tz)

    return NextResponse.json({
      created,
      errors,
      horizonDays,
      eventCount: events.length,
      message:
        created > 0
          ? `Created ${created} event(s) in Google Calendar.`
          : "No events were created. Check errors or reconnect Google.",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/calendar/google/sync failed", { error: message })
    return NextResponse.json({ error: message.slice(0, 500) }, { status: 500 })
  }
}
