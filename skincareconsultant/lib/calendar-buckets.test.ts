import { describe, it, expect } from "vitest"
import type { RoutineStep, SavedRoutineSummary } from "./types"
import {
  buildCalendarBuckets,
  getDatesInRange,
  flattenBucketEvents,
  savedRoutineToRoutine,
} from "./calendar-buckets"

function makeStep(id: string, label: string): RoutineStep {
  return { id, order: 1, label }
}

function makeSaved(
  id: string,
  name: string,
  am: RoutineStep[],
  pm: RoutineStep[],
): SavedRoutineSummary {
  return { id, name, am, pm, is_current: id === "a" }
}

describe("getDatesInRange", () => {
  it("returns consecutive YYYY-MM-DD strings", () => {
    const start = new Date("2024-06-10T12:00:00")
    const dates = getDatesInRange(start, 3)
    expect(dates).toHaveLength(3)
    expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("savedRoutineToRoutine", () => {
  it("maps summary to Routine", () => {
    const s = makeSaved("x", "N", [makeStep("1", "A")], [])
    const r = savedRoutineToRoutine(s)
    expect(r.id).toBe("x")
    expect(r.name).toBe("N")
    expect(r.am).toHaveLength(1)
  })
})

describe("buildCalendarBuckets", () => {
  const routineA = makeSaved(
    "a",
    "Morning",
    [makeStep("s1", "Cleanse")],
    [makeStep("s2", "Moist")],
  )
  const routineB = makeSaved("b", "Alt", [makeStep("s3", "Only AM")], [])

  const scope = { includeAm: true, includePm: true, includeWeekly: false }
  const prefs = { amTime: "08:00", pmTime: "20:00" }

  it("returns empty when no default routine id", () => {
    expect(
      buildCalendarBuckets({
        defaultRoutineId: null,
        savedRoutines: [routineA],
        overrides: {},
        horizonDays: 3,
        scope,
        prefs,
        startDate: new Date("2024-01-01T12:00:00Z"),
      }),
    ).toEqual([])
  })

  it("returns empty when no saved routines", () => {
    expect(
      buildCalendarBuckets({
        defaultRoutineId: "a",
        savedRoutines: [],
        overrides: {},
        horizonDays: 3,
        scope,
        prefs,
        startDate: new Date("2024-01-01T12:00:00Z"),
      }),
    ).toEqual([])
  })

  it("uses override routine for a specific date", () => {
    const start = new Date("2024-01-01T12:00:00Z")
    const d0 = start.toISOString().slice(0, 10)
    const buckets = buildCalendarBuckets({
      defaultRoutineId: "a",
      savedRoutines: [routineA, routineB],
      overrides: { [d0]: "b" },
      horizonDays: 1,
      scope,
      prefs,
      startDate: start,
    })
    expect(buckets).toHaveLength(1)
    expect(buckets[0].routineId).toBe("b")
    expect(buckets[0].date).toBe(d0)
    const amOnly = buckets[0].events.filter((e) => e.tags.includes("am"))
    expect(amOnly.length).toBeGreaterThan(0)
    const pm = buckets[0].events.filter((e) => e.tags.includes("pm"))
    expect(pm).toHaveLength(0)
  })

  it("default routine used when no override", () => {
    const start = new Date("2024-01-02T12:00:00Z")
    const buckets = buildCalendarBuckets({
      defaultRoutineId: "a",
      savedRoutines: [routineA, routineB],
      overrides: {},
      horizonDays: 2,
      scope,
      prefs,
      startDate: start,
    })
    expect(buckets).toHaveLength(2)
    expect(buckets.every((b) => b.routineId === "a")).toBe(true)
  })
})

describe("flattenBucketEvents", () => {
  it("concatenates events in bucket order", () => {
    const routineA = makeSaved(
      "a",
      "R",
      [{ id: "s1", order: 1, label: "AM" }],
      [{ id: "s2", order: 1, label: "PM" }],
    )
    const start = new Date("2024-01-01T12:00:00Z")
    const buckets = buildCalendarBuckets({
      defaultRoutineId: "a",
      savedRoutines: [routineA],
      overrides: {},
      horizonDays: 2,
      scope: { includeAm: true, includePm: true, includeWeekly: false },
      prefs: {},
      startDate: start,
    })
    const flat = flattenBucketEvents(buckets)
    expect(flat.length).toBeGreaterThan(0)
    expect(flat.length).toBe(buckets[0].events.length + buckets[1].events.length)
  })
})
