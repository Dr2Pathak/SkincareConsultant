import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { interpretCalendarRequestWithTot } from "./calendar-ai-tot"
import { generateJsonText } from "@/lib/gemini"
import { createMetricsCollector, rate } from "@/lib/metrics/collector"

vi.mock("@/lib/gemini", () => ({
  generateJsonText: vi.fn(),
}))

const FIXTURES = path.join(__dirname, "fixtures", "calendar-tot")

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), "utf8")
}

const CTX = {
  defaultRoutineId: "routine-default",
  savedRoutines: [
    { id: "routine-default", name: "Default" },
    { id: "routine-a", name: "A" },
  ],
  maxHorizonDays: 30,
}

describe("calendar-ai-tot pipeline metrics", () => {
  beforeEach(() => {
    vi.mocked(generateJsonText).mockReset()
  })

  it("measures parse success and orchestration success with valid fixtures", async () => {
    const metrics = createMetricsCollector()
    vi.mocked(generateJsonText)
      .mockResolvedValueOnce(loadFixture("valid-phase1.json"))
      .mockResolvedValueOnce(loadFixture("valid-phase2.json"))

    const result = await interpretCalendarRequestWithTot("Sync 14 days AM and PM", CTX)
    const success = result.ok ? 1 : 0
    metrics.setRate("calendar_tot_orchestration_success_rate", success)
    metrics.setRate("calendar_tot_parse_success_rate", success)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.horizonDays).toBe(14)
      expect(result.data.scope.includeAm).toBe(true)
    }
    expect(metrics.buildReport().rates.calendar_tot_orchestration_success_rate).toBe(1)
  })

  it("measures invalid-response recovery rate", async () => {
    const metrics = createMetricsCollector()
    const fixtures: Array<{ phase1: string; phase2?: string; expectOk: boolean }> = [
      { phase1: loadFixture("invalid-json.txt"), expectOk: false },
      {
        phase1: JSON.stringify({ branches: [{ id: "only" }] }),
        expectOk: false,
      },
      {
        phase1: loadFixture("valid-phase1.json"),
        phase2: loadFixture("invalid-json.txt"),
        expectOk: false,
      },
      {
        phase1: JSON.stringify({
          branches: [
            {
              id: "b1",
              horizon_days: 99,
              include_am: true,
              include_pm: false,
              include_weekly: false,
              routine_id: null,
            },
            {
              id: "b2",
              horizon_days: 7,
              include_am: true,
              include_pm: false,
              include_weekly: false,
              routine_id: null,
            },
          ],
        }),
        phase2: loadFixture("bad-horizon-phase2.json"),
        expectOk: false,
      },
    ]

    let recovered = 0
    for (const f of fixtures) {
      vi.mocked(generateJsonText).mockReset()
      if (f.phase2) {
        vi.mocked(generateJsonText).mockResolvedValueOnce(f.phase1).mockResolvedValueOnce(f.phase2)
      } else {
        vi.mocked(generateJsonText).mockResolvedValueOnce(f.phase1)
      }
      const result = await interpretCalendarRequestWithTot("test", CTX)
      if (!result.ok && result.message.length > 0) recovered += 1
      expect(result.ok).toBe(f.expectOk)
    }

    metrics.setRate("calendar_tot_parse_recovery_rate", rate(recovered, fixtures.length))
    expect(recovered).toBe(fixtures.length)
  })

  it("structured parsing accuracy over golden fixtures", async () => {
    vi.mocked(generateJsonText)
      .mockResolvedValueOnce(loadFixture("valid-phase1.json"))
      .mockResolvedValueOnce(loadFixture("valid-phase2.json"))

    const result = await interpretCalendarRequestWithTot("14 days", CTX)
    const metrics = createMetricsCollector()
    metrics.setRate("calendar_tot_structured_parse_accuracy", result.ok ? 1 : 0)
    expect(metrics.buildReport().rates.calendar_tot_structured_parse_accuracy).toBe(1)
  })
})
