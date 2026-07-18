/**
 * GET /api/health/ready — readiness (dependencies reachable).
 */

import { NextResponse } from "next/server"
import { getEnvHealth } from "@/lib/env"
import { isRedisConfigured } from "@/lib/cache/redis"
import { getNeo4jDriver } from "@/lib/neo4j"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { withTimeout } from "@/lib/resilience"

async function pingNeo4j(): Promise<boolean> {
  try {
    const driver = getNeo4jDriver()
    await withTimeout(
      (async () => {
        const session = driver.session()
        try {
          await session.run("RETURN 1")
        } finally {
          await session.close()
        }
      })(),
      3000,
      "neo4j",
    )
    return true
  } catch {
    return false
  }
}

async function pingPinecone(): Promise<boolean> {
  try {
    const pc = getPineconeClient()
    const host = getPineconeIndexHost()
    await withTimeout(
      (async () => {
        const index = pc.index({ host })
        await index.describeIndexStats()
      })(),
      3000,
      "pinecone",
    )
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const config = getEnvHealth()
  const checks: Record<string, boolean> = {
    supabase_configured: config.supabase === "ok",
    neo4j_configured: config.neo4j === "ok",
    pinecone_configured: config.pinecone === "ok",
    gemini_configured: config.gemini === "ok",
    redis_configured: isRedisConfigured(),
  }

  if (config.neo4j === "ok") checks.neo4j_reachable = await pingNeo4j()
  if (config.pinecone === "ok") checks.pinecone_reachable = await pingPinecone()

  const { getCacheHitRates, cacheBackend } = await import("@/lib/cache/chat-cache")
  const cacheMetrics = await getCacheHitRates()

  const required = ["supabase_configured", "gemini_configured", "pinecone_configured"]
  const ready = required.every((k) => checks[k] === true)

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks,
      cache: { backend: cacheBackend(), hitRates: cacheMetrics },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  )
}
