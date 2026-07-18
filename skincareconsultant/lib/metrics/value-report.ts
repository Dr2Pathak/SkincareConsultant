/**
 * Human-readable "why this architecture matters" report from measured scenarios.
 */

export type ValueMetricBullet = {
  feature: string
  metric: string
  value: string
  detail?: string
}

export type ValueMetricsSnapshot = {
  generatedAt: string
  environment: "simulated" | "live"
  bullets: ValueMetricBullet[]
  raw: Record<string, number | string>
}

export function formatValueReport(snapshot: ValueMetricsSnapshot): string {
  const lines: string[] = [
    `# Architecture value report (${snapshot.environment})`,
    `Generated: ${snapshot.generatedAt}`,
    "",
    "## Headline metrics",
    "",
  ]

  for (const b of snapshot.bullets) {
    lines.push(`- **${b.feature}** — ${b.metric}: **${b.value}**${b.detail ? ` — ${b.detail}` : ""}`)
  }

  if (Object.keys(snapshot.raw).length > 0) {
    lines.push("", "## Raw numbers", "")
    for (const [k, v] of Object.entries(snapshot.raw).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`- ${k}: ${v}`)
    }
  }

  lines.push(
    "",
    "## How to read this",
    "",
    "- Retrieval savings (Pinecone/Neo4j) are the main win from chat caches; the LLM still runs every turn.",
    "- Semantic tier helps paraphrased follow-ups in the same routine session.",
    "- Tree-of-Thoughts trades 2 structured Gemini calls for validated calendar intent before any Google write.",
    "- Run `npm run test:metrics` to refresh; set `RUN_LIVE_METRICS=1` for production latencies.",
  )

  return lines.join("\n")
}
