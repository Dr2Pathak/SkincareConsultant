import type { CounterStats, MetricsReport, TimingStats } from "./types"

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Linear interpolation percentile on sorted values (p in 0–100). */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const w = idx - lo
  return sorted[lo] * (1 - w) + sorted[hi] * w
}

/** Percent reduction from baseline to improved (0–100). */
export function reductionPct(baseline: number, improved: number): number {
  if (baseline <= 0) return 0
  return Math.max(0, Math.min(100, ((baseline - improved) / baseline) * 100))
}

/** Wall-clock speedup from baselineMs to improvedMs (0–100). */
export function speedupPct(baselineMs: number, improvedMs: number): number {
  return reductionPct(baselineMs, improvedMs)
}

export function rate(successes: number, total: number): number {
  if (total <= 0) return 0
  return successes / total
}

export type MetricsCollector = ReturnType<typeof createMetricsCollector>

export function createMetricsCollector() {
  const timings = new Map<string, number[]>()
  const counters = new Map<string, { hits: number; misses: number }>()
  const rates = new Map<string, number>()

  function recordDuration(name: string, durationMs: number): void {
    const list = timings.get(name) ?? []
    list.push(durationMs)
    timings.set(name, list)
  }

  function recordHit(name: string): void {
    const c = counters.get(name) ?? { hits: 0, misses: 0 }
    c.hits += 1
    counters.set(name, c)
  }

  function recordMiss(name: string): void {
    const c = counters.get(name) ?? { hits: 0, misses: 0 }
    c.misses += 1
    counters.set(name, c)
  }

  function setRate(name: string, value: number): void {
    rates.set(name, value)
  }

  function timingStats(name: string): TimingStats | null {
    const values = timings.get(name)
    if (!values?.length) return null
    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: sorted.length,
      meanMs: mean(sorted),
      p95Ms: percentile(sorted, 95),
      minMs: sorted[0],
      maxMs: sorted[sorted.length - 1],
    }
  }

  function counterStats(name: string): CounterStats | null {
    const c = counters.get(name)
    if (!c) return null
    const total = c.hits + c.misses
    return {
      hits: c.hits,
      misses: c.misses,
      hitRate: total > 0 ? c.hits / total : 0,
    }
  }

  function buildReport(): MetricsReport {
    const timingReport: MetricsReport["timings"] = {}
    for (const key of timings.keys()) {
      const stats = timingStats(key)
      if (stats) timingReport[key] = stats
    }
    const counterReport: MetricsReport["counters"] = {}
    for (const key of counters.keys()) {
      const stats = counterStats(key)
      if (stats) counterReport[key] = stats
    }
    return {
      timings: timingReport,
      counters: counterReport,
      rates: Object.fromEntries(rates),
      generatedAt: new Date().toISOString(),
    }
  }

  return {
    recordDuration,
    recordHit,
    recordMiss,
    setRate,
    timingStats,
    counterStats,
    buildReport,
    reductionPct,
    speedupPct,
    rate,
  }
}
