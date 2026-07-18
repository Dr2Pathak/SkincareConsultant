/** Test and perf-script metrics shapes (not wired to production). */

export type TimingStats = {
  count: number
  meanMs: number
  p95Ms: number
  minMs: number
  maxMs: number
}

export type CounterStats = {
  hits: number
  misses: number
  hitRate: number
}

export type MetricsReport = {
  timings: Record<string, TimingStats>
  counters: Record<string, CounterStats>
  rates: Record<string, number>
  generatedAt: string
}
