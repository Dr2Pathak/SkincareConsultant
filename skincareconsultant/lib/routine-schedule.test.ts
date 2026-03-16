import { describe, it, expect } from "vitest"
import type { Routine, RoutineStep } from "./types"
import { buildRoutineSchedule } from "./routine-schedule"

function makeStep(id: string, label: string): RoutineStep {
  return { id, order: 1, label }
}

describe("buildRoutineSchedule", () => {
  const baseRoutine: Routine = {
    id: "r1",
    name: "Test routine",
    am: [makeStep("am-1", "Cleanser")],
    pm: [makeStep("pm-1", "Moisturizer")],
  }

  const today = new Date("2024-01-01T00:00:00Z") // Monday

  it("creates AM and PM events for each day within horizon when enabled", () => {
    const events = buildRoutineSchedule(
      baseRoutine,
      { amTime: "07:00", pmTime: "21:30" },
      { includeAm: true, includePm: true, includeWeekly: false },
      { horizonDays: 3, today },
    )

    expect(events).toHaveLength(3 * 2)
    const amEvents = events.filter((e) => e.tags.includes("am"))
    const pmEvents = events.filter((e) => e.tags.includes("pm"))
    expect(amEvents).toHaveLength(3)
    expect(pmEvents).toHaveLength(3)
    expect(amEvents[0].time).toBe("07:00")
    expect(pmEvents[0].time).toBe("21:30")
    expect(amEvents[0].label).toMatch(/Morning/)
    expect(pmEvents[0].label).toMatch(/Evening/)
  })

  it("uses default times when prefs are missing", () => {
    const events = buildRoutineSchedule(
      baseRoutine,
      {},
      { includeAm: true, includePm: true, includeWeekly: false },
      { horizonDays: 1, today },
    )
    const am = events.find((e) => e.tags.includes("am"))
    const pm = events.find((e) => e.tags.includes("pm"))
    expect(am?.time).toBe("07:30")
    expect(pm?.time).toBe("22:00")
  })

  it("creates weekly treatment events on configured weekdays", () => {
    const events = buildRoutineSchedule(
      baseRoutine,
      { weeklyDays: ["Mon", "Wed"], weeklyTime: "20:00" },
      { includeAm: false, includePm: false, includeWeekly: true },
      { horizonDays: 7, today },
    )
    const weekly = events.filter((e) => e.tags.includes("weekly"))
    expect(weekly).toHaveLength(2)
    expect(weekly[0].time).toBe("20:00")
    expect(weekly[0].label).toMatch(/Weekly treatment/)
  })

  it("does not create events when routine steps are empty", () => {
    const routine: Routine = { id: "r2", name: "Empty", am: [], pm: [] }
    const events = buildRoutineSchedule(
      routine,
      {},
      { includeAm: true, includePm: true, includeWeekly: true },
      { horizonDays: 5, today },
    )
    expect(events).toHaveLength(0)
  })
})

