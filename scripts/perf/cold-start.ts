/**
 * Poll /api/health until the server responds; reports time from script start.
 *
 * Usage:
 *   RUN_LIVE_METRICS=1 tsx scripts/perf/cold-start.ts --baseUrl http://localhost:3000
 */

import { createMetricsCollector } from "../../skincareconsultant/lib/metrics/collector"
import { formatMetricsSummary } from "../../skincareconsultant/lib/metrics/report"

export async function measureColdStart(
  baseUrl: string,
  opts: { maxWaitMs?: number; intervalMs?: number } = {},
): Promise<{ coldStartMs: number; ok: boolean }> {
  const maxWaitMs = opts.maxWaitMs ?? 120_000
  const intervalMs = opts.intervalMs ?? 250
  const url = `${baseUrl.replace(/\/$/, "")}/api/health`
  const started = performance.now()

  while (performance.now() - started < maxWaitMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        return { coldStartMs: performance.now() - started, ok: true }
      }
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  return { coldStartMs: performance.now() - started, ok: false }
}

async function main() {
  if (process.env.RUN_LIVE_METRICS !== "1") {
    console.error("Set RUN_LIVE_METRICS=1 to run cold-start measurement.")
    process.exit(1)
  }

  const baseUrl = process.argv.includes("--baseUrl")
    ? process.argv[process.argv.indexOf("--baseUrl") + 1]
    : (process.env.PERF_BASE_URL ?? "http://localhost:3000")

  const { coldStartMs, ok } = await measureColdStart(baseUrl)
  const metrics = createMetricsCollector()
  metrics.recordDuration("infra_cold_start", coldStartMs)
  metrics.setRate("infra_cold_start_ok", ok ? 1 : 0)

  console.log(`Cold start (${baseUrl}): ${coldStartMs.toFixed(0)}ms ok=${ok}`)
  console.log(formatMetricsSummary(metrics.buildReport()))
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
