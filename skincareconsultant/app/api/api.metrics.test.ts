import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as healthGET } from "./health/route"
import { POST as chatPOST, resetChatCachesForTests } from "./chat/route"
import { GET as compatibilityGET } from "./compatibility/route"
import { GET as routineHealthGET } from "./routine-health/route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getNeo4jDriver } from "@/lib/neo4j"
import { createMetricsCollector, rate } from "@/lib/metrics/collector"
import { formatMetricsSummary } from "@/lib/metrics/report"
import { authRequest } from "@/lib/test/chat-auth-mock"

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }))
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>()
  return {
    ...actual,
    getChatEnvError: vi.fn(),
  }
})
vi.mock("@/lib/gemini", () => ({
  embedTexts: vi.fn(),
  generateChatReply: vi.fn(),
}))
vi.mock("@/lib/pinecone", () => ({
  getPineconeClient: vi.fn(),
  getPineconeIndexHost: vi.fn(),
}))
vi.mock("@/lib/chat-context", () => ({
  getRoutineKnowledgeContext: vi.fn(),
}))
vi.mock("@/lib/supabase/auth-server", () => ({
  getUserFromRequest: vi.fn().mockResolvedValue({ id: "test-user-metrics" }),
}))
vi.mock("@/lib/neo4j", () => ({ getNeo4jDriver: vi.fn() }))

function supabaseProductMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "prod-1", name: "Test Serum", inci_list: ["Niacinamide", "Water"] },
    }),
  }
  return {
    from: vi.fn(() => chain),
  }
}

describe("API metrics", () => {
  beforeEach(async () => {
    await resetChatCachesForTests()
    vi.clearAllMocks()
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: vi.fn().mockResolvedValue({ matches: [] }) })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockResolvedValue([[0.1]])
    vi.mocked(generateChatReply).mockResolvedValue("OK")
    vi.mocked(getRoutineKnowledgeContext).mockResolvedValue("")
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "test-user-metrics" } as Awaited<
      ReturnType<typeof getUserFromRequest>
    >)
    vi.mocked(getSupabaseServer).mockReturnValue(supabaseProductMock() as unknown as ReturnType<
      typeof getSupabaseServer
    >)
    vi.mocked(getNeo4jDriver).mockReturnValue({
      session: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({ records: [] }),
        close: vi.fn().mockResolvedValue(undefined),
      })),
    } as unknown as ReturnType<typeof getNeo4jDriver>)
  })

  it("samples health endpoint latency", async () => {
    const metrics = createMetricsCollector()
    const n = 5
    for (let i = 0; i < n; i++) {
      const t0 = performance.now()
      const res = await healthGET()
      metrics.recordDuration("api_health", performance.now() - t0)
      expect(res.status).toBe(200)
    }
    const stats = metrics.timingStats("api_health")
    expect(stats?.count).toBe(n)
    console.log(formatMetricsSummary(metrics.buildReport()))
  })

  it("samples compatibility and routine-health latency", async () => {
    const metrics = createMetricsCollector()

    const t0 = performance.now()
    const compat = await compatibilityGET(new Request("http://x/api/compatibility?productId=prod-1"))
    metrics.recordDuration("api_compatibility", performance.now() - t0)
    expect(compat.status).toBe(200)

    const t1 = performance.now()
    const health = await routineHealthGET(new Request("http://x/api/routine-health"))
    metrics.recordDuration("api_routine_health", performance.now() - t1)
    expect(health.status).toBe(200)

    expect(metrics.timingStats("api_compatibility")?.count).toBe(1)
    expect(metrics.timingStats("api_routine_health")?.count).toBe(1)
  })

  it("records chat failure rate under injected errors", async () => {
    const metrics = createMetricsCollector()
    const total = 8
    let failures = 0

    for (let i = 0; i < total; i++) {
      if (i % 2 === 0) {
        vi.mocked(embedTexts).mockRejectedValueOnce(new Error("embed fail"))
      } else {
        vi.mocked(embedTexts).mockResolvedValueOnce([[0.1]])
      }
      const res = await chatPOST(
        authRequest({
          method: "POST",
          body: JSON.stringify({ message: `fail-matrix-${i}-${Date.now()}` }),
        }),
      )
      if (res.status >= 500) failures += 1
    }

    metrics.setRate("api_chat_failure_rate", rate(failures, total))
    metrics.setRate("api_chat_success_rate", rate(total - failures, total))
    expect(metrics.buildReport().rates.api_chat_failure_rate).toBeGreaterThan(0)
    expect(metrics.buildReport().rates.api_chat_success_rate).toBeLessThan(1)
  })

  it("compatibility does not call generateChatReply (no LLM verdict)", async () => {
    vi.mocked(generateChatReply).mockClear()
    await compatibilityGET(new Request("http://x/api/compatibility?productId=prod-1"))
    expect(vi.mocked(generateChatReply)).not.toHaveBeenCalled()
  })
})
