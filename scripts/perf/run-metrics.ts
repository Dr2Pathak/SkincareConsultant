/**
 * Orchestrates optional live performance metrics against a running app.
 *
 * Prerequisites:
 *   - Server: npm run start (or deployed PERF_BASE_URL)
 *   - RUN_LIVE_METRICS=1
 *   - GEMINI_API_KEY for Gemini latency probes (optional)
 *
 * Usage:
 *   RUN_LIVE_METRICS=1 npm run perf:metrics
 */

import fs from "node:fs"
import path from "node:path"
import { createMetricsCollector, percentile, mean } from "../../skincareconsultant/lib/metrics/collector"
import { formatMetricsSummary } from "../../skincareconsultant/lib/metrics/report"
import type { MetricsReport } from "../../skincareconsultant/lib/metrics/types"
import { runLoadTest, parseLoadArgs } from "./load-api"
import { measureColdStart } from "./cold-start"

const REPORT_DIR = path.join(process.cwd(), "skincareconsultant", ".perf")
const REPORT_FILE = path.join(REPORT_DIR, "last-report.json")

function mergeReports(base: MetricsReport, extra: MetricsReport): MetricsReport {
  return {
    timings: { ...base.timings, ...extra.timings },
    counters: { ...base.counters, ...extra.counters },
    rates: { ...base.rates, ...extra.rates },
    generatedAt: new Date().toISOString(),
  }
}

async function probeGemini(): Promise<MetricsReport | null> {
  if (!process.env.GEMINI_API_KEY) return null
  const { embedTexts, generateChatReply } = await import("../../skincareconsultant/lib/gemini")
  const metrics = createMetricsCollector()
  const embedMs: number[] = []
  const chatMs: number[] = []

  for (let i = 0; i < 3; i++) {
    const t0 = performance.now()
    await embedTexts([`perf probe ${i}`])
    embedMs.push(performance.now() - t0)
  }
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now()
    await generateChatReply(
      "Reply with one word: ok.",
      `ping ${i}`,
      { maxOutputTokens: 16 },
    )
    chatMs.push(performance.now() - t0)
  }

  const embedSorted = [...embedMs].sort((a, b) => a - b)
  const chatSorted = [...chatMs].sort((a, b) => a - b)
  metrics.setRate("gemini_embed_p95_ms", percentile(embedSorted, 95))
  metrics.setRate("gemini_generateChatReply_p95_ms", percentile(chatSorted, 95))
  for (const ms of embedMs) metrics.recordDuration("gemini_embed", ms)
  for (const ms of chatMs) metrics.recordDuration("gemini_generateChatReply", ms)

  return metrics.buildReport()
}

async function probeChatE2E(baseUrl: string, authToken?: string): Promise<MetricsReport | null> {
  if (!authToken) {
    console.warn("PERF_AUTH_TOKEN not set; skipping live /api/chat e2e probe.")
    return null
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`
  const durations: number[] = []
  const body = JSON.stringify({ message: "What is niacinamide?" })

  for (let i = 0; i < 2; i++) {
    const t0 = performance.now()
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body,
    })
    durations.push(performance.now() - t0)
    if (!res.ok) {
      console.warn(`Chat probe ${i} failed: ${res.status}`)
    }
  }

  const metrics = createMetricsCollector()
  const sorted = [...durations].sort((a, b) => a - b)
  metrics.setRate("chat_e2e_p95_ms", percentile(sorted, 95))
  metrics.setRate("chat_e2e_mean_ms", mean(sorted))
  for (const ms of durations) metrics.recordDuration("chat_e2e", ms)
  return metrics.buildReport()
}

async function main() {
  if (process.env.RUN_LIVE_METRICS !== "1") {
    console.error("Set RUN_LIVE_METRICS=1 to run live performance metrics.")
    process.exit(1)
  }

  const baseUrl = process.env.PERF_BASE_URL ?? "http://localhost:3000"
  let report: MetricsReport = {
    timings: {},
    counters: {},
    rates: {},
    generatedAt: new Date().toISOString(),
  }

  console.log("=== Cold start (if server still booting) ===")
  const cold = await measureColdStart(baseUrl)
  const coldMetrics = createMetricsCollector()
  coldMetrics.recordDuration("infra_cold_start", cold.coldStartMs)
  coldMetrics.setRate("infra_cold_start_ok", cold.ok ? 1 : 0)
  report = mergeReports(report, coldMetrics.buildReport())

  console.log("\n=== Health load test ===")
  const load = await runLoadTest(
    parseLoadArgs([
      "--baseUrl",
      baseUrl,
      "--route",
      "/api/health",
      "--concurrency",
      "10",
      "--durationSec",
      "5",
    ]),
  )
  report = mergeReports(report, load.report)
  if (load.report.timings.load_request) {
    report.rates.health_p95_ms = load.report.timings.load_request.p95Ms
  }

  console.log("\n=== Gemini latency (optional) ===")
  const geminiReport = await probeGemini()
  if (geminiReport) report = mergeReports(report, geminiReport)

  console.log("\n=== Chat e2e (optional, auth required) ===")
  const chatReport = await probeChatE2E(baseUrl, process.env.PERF_AUTH_TOKEN)
  if (chatReport) report = mergeReports(report, chatReport)

  const heapBefore = process.memoryUsage().heapUsed
  const memLoad = await runLoadTest(
    parseLoadArgs([
      "--baseUrl",
      baseUrl,
      "--route",
      "/api/health",
      "--concurrency",
      "5",
      "--durationSec",
      "3",
    ]),
  )
  const heapAfter = process.memoryUsage().heapUsed
  report.rates.perf_heap_delta_bytes = heapAfter - heapBefore
  report = mergeReports(report, memLoad.report)

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))

  console.log("\n=== Summary ===")
  console.log(formatMetricsSummary(report))
  console.log(`\nWrote ${REPORT_FILE}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
