/**
 * Load-test helper for live metrics. Requires a running server (npm run start).
 *
 * Usage:
 *   RUN_LIVE_METRICS=1 tsx scripts/perf/load-api.ts --baseUrl http://localhost:3000 --route /api/health --concurrency 10 --durationSec 5
 */

import { createMetricsCollector, percentile, mean, rate } from "../../skincareconsultant/lib/metrics/collector"
import { formatMetricsSummary } from "../../skincareconsultant/lib/metrics/report"
import type { MetricsReport } from "../../skincareconsultant/lib/metrics/types"

export type LoadArgs = {
  baseUrl: string
  route: string
  concurrency: number
  durationSec: number
  method: "GET" | "POST"
  body?: string
  authToken?: string
}

export function parseLoadArgs(argv = process.argv.slice(2)): LoadArgs {
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
  }
  return {
    baseUrl: get("--baseUrl", process.env.PERF_BASE_URL ?? "http://localhost:3000"),
    route: get("--route", "/api/health"),
    concurrency: Number(get("--concurrency", "10")),
    durationSec: Number(get("--durationSec", "5")),
    method: (get("--method", "GET") as "GET" | "POST") || "GET",
    body: argv.includes("--body") ? get("--body", "{}") : undefined,
    authToken: process.env.PERF_AUTH_TOKEN,
  }
}

async function oneRequest(url: string, args: LoadArgs): Promise<{ ok: boolean; ms: number }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (args.authToken) headers.Authorization = `Bearer ${args.authToken}`

  const t0 = performance.now()
  try {
    const res = await fetch(url, {
      method: args.method,
      headers,
      body: args.method === "POST" ? (args.body ?? "{}") : undefined,
    })
    return { ok: res.ok, ms: performance.now() - t0 }
  } catch {
    return { ok: false, ms: performance.now() - t0 }
  }
}

export async function runLoadTest(args: LoadArgs): Promise<{
  report: MetricsReport
  total: number
  errors: number
  rps: number
  url: string
}> {
  const url = `${args.baseUrl.replace(/\/$/, "")}${args.route}`
  const deadline = Date.now() + args.durationSec * 1000
  const durations: number[] = []
  let total = 0
  let errors = 0

  while (Date.now() < deadline) {
    const batch = Array.from({ length: args.concurrency }, () => oneRequest(url, args))
    const results = await Promise.all(batch)
    for (const r of results) {
      total += 1
      durations.push(r.ms)
      if (!r.ok) errors += 1
    }
  }

  const sorted = [...durations].sort((a, b) => a - b)
  const metrics = createMetricsCollector()
  for (const ms of durations) metrics.recordDuration("load_request", ms)
  metrics.setRate("load_error_rate", rate(total - errors, total))
  metrics.setRate("load_rps", total / args.durationSec)

  const report = metrics.buildReport()
  if (sorted.length > 0 && report.timings.load_request) {
    report.timings.load_request.p95Ms = percentile(sorted, 95)
    report.timings.load_request.meanMs = mean(sorted)
  }

  return { report, total, errors, rps: total / args.durationSec, url }
}

async function main() {
  if (process.env.RUN_LIVE_METRICS !== "1") {
    console.error("Set RUN_LIVE_METRICS=1 to run live load tests.")
    process.exit(1)
  }
  const args = parseLoadArgs()
  const { report, total, errors, rps, url } = await runLoadTest(args)
  console.log(`Load test: ${url}`)
  console.log(`Total=${total} errors=${errors} rps=${rps.toFixed(1)}`)
  console.log(formatMetricsSummary(report))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
