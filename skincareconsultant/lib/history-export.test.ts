import { describe, it, expect } from "vitest"
import { rowsToCsv, type HistoryCsvRow } from "./history-export"

describe("rowsToCsv", () => {
  it("includes header and basic row", () => {
    const rows: HistoryCsvRow[] = [
      {
        date: "2024-01-01",
        routineId: "r1",
        routineName: "My routine",
        changeType: "snapshot",
        changeSummary: "Current routine",
        productsInvolved: "Cleanser; Moisturizer",
        activesInvolved: null,
        irritationScore: null,
        drynessScore: null,
        breakoutsScore: null,
        notes: null,
      },
    ]
    const csv = rowsToCsv(rows)
    expect(csv).toContain("date,routine_id,routine_name")
    expect(csv).toContain("2024-01-01")
    expect(csv).toContain("My routine")
  })

  it("escapes commas, quotes, and newlines", () => {
    const rows: HistoryCsvRow[] = [
      {
        date: "2024-01-02",
        routineId: "r2",
        routineName: "Name, with comma",
        changeType: "note",
        changeSummary: "Summary",
        productsInvolved: null,
        activesInvolved: null,
        irritationScore: null,
        drynessScore: null,
        breakoutsScore: null,
        notes: 'Line 1\nLine "2"',
      },
    ]
    const csv = rowsToCsv(rows)
    expect(csv).toContain('"Name, with comma"')
    expect(csv).toContain('"Line 1\nLine ""2"""')
  })
})

