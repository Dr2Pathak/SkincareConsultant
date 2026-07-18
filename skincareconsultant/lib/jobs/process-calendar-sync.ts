/**
 * Background calendar sync worker (invoked async from POST /api/calendar/google/sync).
 */

import { getSupabaseServer } from "@/lib/supabase/server"
import { loadCalendarBootstrapForUser } from "@/lib/calendar-bootstrap-data"
import { buildCalendarBuckets, flattenBucketEvents } from "@/lib/calendar-buckets"
import type { RoutineSchedulePrefs } from "@/lib/routine-schedule"
import { interpretCalendarRequestWithTot } from "@/lib/calendar-ai-tot"
import { insertRoutineEventsToGoogleCalendar } from "@/lib/google-calendar-insert"
import { updateCalendarSyncJob } from "./calendar-sync-store"
import { withSpan } from "@/lib/telemetry/tracing"

const MAX_HORIZON = 42

export type CalendarSyncPayload = {
  message: string
  includeAm?: boolean
  includePm?: boolean
  includeWeekly?: boolean
  amTime?: string
  pmTime?: string
  weeklyTime?: string
  weeklyDays?: string[]
  timeZone?: string
  maxHorizonDays?: number
}

export async function processCalendarSyncJob(
  jobId: string,
  userId: string,
  body: CalendarSyncPayload,
): Promise<void> {
  await updateCalendarSyncJob(jobId, { status: "running" })

  try {
    await withSpan("calendar.sync.job", { jobId, userId }, async () => {
      const supabase = getSupabaseServer()

      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .select("google_calendar_refresh_token, calendar_time_zone")
        .eq("id", userId)
        .maybeSingle()

      if (profileErr) throw new Error("Could not load profile")
      const refreshToken = profileRow?.google_calendar_refresh_token as string | null | undefined
      if (!refreshToken) throw new Error("Google Calendar not connected")

      const { defaultRoutineId, savedRoutines, overrides } = await loadCalendarBootstrapForUser(userId)
      const routineSummaries = savedRoutines.map((r) => ({ id: r.id, name: r.name }))
      const cap = Math.min(MAX_HORIZON, body.maxHorizonDays ?? MAX_HORIZON)

      const tot = await interpretCalendarRequestWithTot(body.message, {
        defaultRoutineId,
        savedRoutines: routineSummaries,
        maxHorizonDays: cap,
      })

      if (!tot.ok) {
        await updateCalendarSyncJob(jobId, { status: "failed", error: tot.message })
        return
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
        await updateCalendarSyncJob(jobId, {
          status: "failed",
          error: "No events to sync. Add routine steps or enable AM/PM/weekly.",
        })
        return
      }

      const tz =
        body.timeZone ||
        (typeof profileRow?.calendar_time_zone === "string" ? profileRow.calendar_time_zone : "") ||
        "UTC"

      if (body.timeZone && body.timeZone.length > 1) {
        await supabase
          .from("profiles")
          .update({ calendar_time_zone: body.timeZone, updated_at: new Date().toISOString() })
          .eq("id", userId)
      }

      const { created, errors } = await insertRoutineEventsToGoogleCalendar(refreshToken, events, tz)

      await updateCalendarSyncJob(jobId, {
        status: "completed",
        result: {
          created,
          errors,
          horizonDays,
          eventCount: events.length,
          message:
            created > 0
              ? `Created ${created} event(s) in Google Calendar.`
              : "No events were created. Check errors or reconnect Google.",
        },
      })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("calendar sync job failed", { jobId, userId, error: message })
    await updateCalendarSyncJob(jobId, { status: "failed", error: message.slice(0, 500) })
  }
}
