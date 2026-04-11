/**
 * Builds per-day schedule buckets matching the routine calendar UI:
 * for each date in the horizon, resolve routineId from overrides (or default),
 * then run buildRoutineSchedule for that single day.
 */

import { buildRoutineSchedule } from "./routine-schedule"
import type { RoutineScheduleEvent, RoutineSchedulePrefs, RoutineScheduleScope } from "./routine-schedule"
import type { Routine, SavedRoutineSummary } from "./types"

export type CalendarDayBucket = {
  date: string
  events: RoutineScheduleEvent[]
  routineId: string
}

export function getDatesInRange(startDate: Date, horizonDays: number): string[] {
  const out: string[] = []
  const d = new Date(startDate)
  d.setHours(0, 0, 0, 0)
  for (let i = 0; i < horizonDays; i++) {
    const next = new Date(d)
    next.setDate(d.getDate() + i)
    out.push(next.toISOString().slice(0, 10))
  }
  return out
}

export function savedRoutineToRoutine(r: SavedRoutineSummary): Routine {
  return { id: r.id, name: r.name, am: r.am, pm: r.pm }
}

export type BuildCalendarBucketsInput = {
  defaultRoutineId: string | null
  savedRoutines: SavedRoutineSummary[]
  overrides: Record<string, string>
  horizonDays: number
  scope: RoutineScheduleScope
  prefs: RoutineSchedulePrefs
  /** Defaults to today at local midnight. */
  startDate?: Date
}

/**
 * Returns one bucket per day in [startDate, startDate + horizonDays).
 * If defaultRoutineId is missing or there are no routines, returns [].
 */
export function buildCalendarBuckets(input: BuildCalendarBucketsInput): CalendarDayBucket[] {
  const {
    defaultRoutineId,
    savedRoutines,
    overrides,
    horizonDays,
    scope,
    prefs,
    startDate: startInput,
  } = input

  if (!defaultRoutineId || savedRoutines.length === 0) return []

  const start = startInput ? new Date(startInput) : new Date()
  start.setHours(0, 0, 0, 0)
  const dates = getDatesInRange(start, horizonDays)
  const result: CalendarDayBucket[] = []

  for (const dateStr of dates) {
    const routineId = overrides[dateStr] ?? defaultRoutineId
    const routine = savedRoutines.find((r) => r.id === routineId)
    if (!routine) {
      result.push({ date: dateStr, events: [], routineId })
      continue
    }
    const dayDate = new Date(`${dateStr}T12:00:00`)
    const events = buildRoutineSchedule(savedRoutineToRoutine(routine), prefs, scope, {
      horizonDays: 1,
      today: dayDate,
    })
    result.push({ date: dateStr, events, routineId })
  }

  return result
}

/**
 * Flatten all events from buckets in date order (for exports / Google Calendar).
 */
export function flattenBucketEvents(buckets: CalendarDayBucket[]): RoutineScheduleEvent[] {
  return buckets.flatMap((b) => b.events)
}
