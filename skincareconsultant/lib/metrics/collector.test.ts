import { describe, it, expect } from "vitest"
import {
  createMetricsCollector,
  mean,
  percentile,
  reductionPct,
  speedupPct,
  rate,
} from "./collector"

describe("metrics collector", () => {
  it("computes timing stats and rates", () => {
    const c = createMetricsCollector()
    c.recordDuration("api", 10)
    c.recordDuration("api", 20)
    c.recordDuration("api", 30)
    c.recordHit("cache")
    c.recordMiss("cache")
    c.setRate("success", 0.9)

    const report = c.buildReport()
    expect(report.timings.api.count).toBe(3)
    expect(report.timings.api.meanMs).toBe(20)
    expect(report.counters.cache.hitRate).toBe(0.5)
    expect(report.rates.success).toBe(0.9)
  })

  it("reduction and speedup helpers", () => {
    expect(reductionPct(10, 4)).toBe(60)
    expect(speedupPct(100, 58)).toBe(42)
    expect(mean([1, 2, 3])).toBe(2)
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3)
    expect(rate(9, 10)).toBe(0.9)
  })
})
