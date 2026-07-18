import { describe, it, expect } from "vitest"
import { createMetricsCollector } from "@/lib/metrics/collector"
import { formatMetricsSummary } from "@/lib/metrics/report"

const runLive = process.env.RUN_LIVE_METRICS === "1" && !!process.env.GEMINI_API_KEY

describe.skipIf(!runLive)("gemini live metrics", () => {
  it("records generateChatReply and embedTexts latency distribution", async () => {
    const { embedTexts, generateChatReply } = await import("@/lib/gemini")
    const metrics = createMetricsCollector()
    const samples = 3

    for (let i = 0; i < samples; i++) {
      const t0 = performance.now()
      await embedTexts([`metrics probe ${i}`])
      metrics.recordDuration("gemini_embed", performance.now() - t0)
    }

    for (let i = 0; i < samples; i++) {
      const t0 = performance.now()
      await generateChatReply(
        "You are a test assistant. Reply with one word: ok.",
        `ping ${i}`,
        { maxOutputTokens: 16 },
      )
      metrics.recordDuration("gemini_generateChatReply", performance.now() - t0)
    }

    const report = metrics.buildReport()
    expect(report.timings.gemini_embed?.count).toBe(samples)
    expect(report.timings.gemini_generateChatReply?.count).toBe(samples)
    console.log(formatMetricsSummary(report))
  }, 60_000)
})
