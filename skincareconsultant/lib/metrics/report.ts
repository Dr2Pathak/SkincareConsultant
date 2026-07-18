import type { MetricsReport } from "./types"

/** Human-readable summary for console or test logs. */
export function formatMetricsSummary(report: MetricsReport): string {
  const lines: string[] = [`Metrics report (${report.generatedAt})`, ""]

  const timingKeys = Object.keys(report.timings).sort()
  if (timingKeys.length > 0) {
    lines.push("Timings:")
    for (const key of timingKeys) {
      const t = report.timings[key]
      lines.push(
        `  ${key}: count=${t.count} mean=${t.meanMs.toFixed(1)}ms p95=${t.p95Ms.toFixed(1)}ms min=${t.minMs.toFixed(1)}ms max=${t.maxMs.toFixed(1)}ms`,
      )
    }
    lines.push("")
  }

  const counterKeys = Object.keys(report.counters).sort()
  if (counterKeys.length > 0) {
    lines.push("Counters:")
    for (const key of counterKeys) {
      const c = report.counters[key]
      lines.push(
        `  ${key}: hits=${c.hits} misses=${c.misses} hit_rate=${(c.hitRate * 100).toFixed(1)}%`,
      )
    }
    lines.push("")
  }

  const rateKeys = Object.keys(report.rates).sort()
  if (rateKeys.length > 0) {
    lines.push("Rates:")
    for (const key of rateKeys) {
      const v = report.rates[key]
      const display = v <= 1 && v >= 0 ? `${(v * 100).toFixed(1)}%` : v.toFixed(2)
      lines.push(`  ${key}: ${display}`)
    }
  }

  return lines.join("\n")
}
