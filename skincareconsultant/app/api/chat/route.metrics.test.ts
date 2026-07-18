import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, resetChatCachesForTests } from "./route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { createMetricsCollector } from "@/lib/metrics/collector"
import { formatMetricsSummary } from "@/lib/metrics/report"
import { authRequest } from "@/lib/test/chat-auth-mock"

vi.mock("@/lib/supabase/auth-server", () => ({
  getUserFromRequest: vi.fn().mockResolvedValue({ id: "test-user-metrics" }),
}))
vi.mock("@/lib/env", () => ({ getChatEnvError: vi.fn() }))
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

const ROUTINE = {
  am: [{ productId: "prod-metrics-1" }],
  pm: [],
}

function chatRequest(message: string, routine = ROUTINE) {
  return POST(
    authRequest({
      method: "POST",
      body: JSON.stringify({ message, routine }),
    }),
  )
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

describe("POST /api/chat metrics", () => {
  let queryMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await resetChatCachesForTests()
    vi.clearAllMocks()
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    queryMock = vi.fn().mockResolvedValue({
      matches: [
        {
          id: "m1",
          metadata: { type: "ingredient", name: "Niacinamide", text: "Context chunk for cache." },
        },
      ],
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockResolvedValue([[1, 0, 0]])
    vi.mocked(getRoutineKnowledgeContext).mockResolvedValue("Knowledge context")
    vi.mocked(generateChatReply).mockImplementation(async () => {
      await delay(5)
      return "Test reply."
    })
  })

  it("records E2E latency and external call counts on cold vs warm path", async () => {
    const metrics = createMetricsCollector()
    const message = `metrics-e2e-${Date.now()}-${Math.random()}`

    const t0 = performance.now()
    const res1 = await chatRequest(message)
    const coldMs = performance.now() - t0
    expect(res1.status).toBe(200)
    metrics.recordDuration("chat_e2e_cold", coldMs)
    metrics.recordMiss("chat_exact_rag_cache")

    const t1 = performance.now()
    const res2 = await chatRequest(message)
    const warmMs = performance.now() - t1
    expect(res2.status).toBe(200)
    metrics.recordDuration("chat_e2e_warm", warmMs)
    metrics.recordHit("chat_exact_rag_cache")

    const pineconeCalls = queryMock.mock.calls.length
    const embedCalls = vi.mocked(embedTexts).mock.calls.length
    const knowledgeCalls = vi.mocked(getRoutineKnowledgeContext).mock.calls.length
    const llmCalls = vi.mocked(generateChatReply).mock.calls.length

    expect(pineconeCalls).toBe(1)
    expect(knowledgeCalls).toBe(1)
    expect(llmCalls).toBe(2)
    expect(embedCalls).toBeGreaterThanOrEqual(1)

    const pineconeReduction = metrics.reductionPct(pineconeCalls, Math.max(0, pineconeCalls - 1))
    metrics.setRate("chat_pinecone_duplicate_call_reduction_pct", pineconeReduction)
    metrics.setRate(
      "chat_rag_cache_speedup_pct",
      metrics.speedupPct(coldMs, warmMs),
    )

    const report = metrics.buildReport()
    expect(report.rates.chat_pinecone_duplicate_call_reduction_pct).toBeGreaterThan(0)
    expect(formatMetricsSummary(report)).toMatch(/chat_e2e/)
  })

  it("semantic RAG tier skips Pinecone on similar embedding", async () => {
    const query = vi.fn().mockResolvedValue({
      matches: [{ id: "m1", metadata: { type: "ingredient", name: "Retinol", text: "Semantic context." } }],
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query })),
    } as unknown as ReturnType<typeof getPineconeClient>)

    const suffix = `${Date.now()}-${Math.random()}`
    const msg1 = `what is retinol metrics-semantic-${suffix}`
    const msg2 = `tell me about retinol benefits metrics-semantic-${suffix}`
    const semanticRoutine = {
      am: [{ productId: `prod-semantic-${suffix}` }],
      pm: [] as typeof ROUTINE.pm,
    }

    vi.mocked(embedTexts).mockResolvedValue([[1, 0, 0]])

    const res1 = await POST(
      authRequest({
        method: "POST",
        body: JSON.stringify({ message: msg1, routine: semanticRoutine }),
      }),
    )
    expect(res1.status).toBe(200)
    expect(query.mock.calls.length).toBe(1)

    const res2 = await POST(
      authRequest({
        method: "POST",
        body: JSON.stringify({ message: msg2, routine: semanticRoutine }),
      }),
    )
    expect(res2.status).toBe(200)
    expect(query.mock.calls.length).toBe(1)
    expect(vi.mocked(embedTexts).mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(vi.mocked(generateChatReply).mock.calls.length).toBe(2)
  })

  it("computes duplicate API call reduction across warm repeat", async () => {
    const metrics = createMetricsCollector()
    const message = `metrics-dup-${Date.now()}-${Math.random()}`

    await chatRequest(message)
    const afterCold = {
      pinecone: queryMock.mock.calls.length,
      knowledge: vi.mocked(getRoutineKnowledgeContext).mock.calls.length,
      embed: vi.mocked(embedTexts).mock.calls.length,
    }

    await chatRequest(message)
    const afterWarm = {
      pinecone: queryMock.mock.calls.length,
      knowledge: vi.mocked(getRoutineKnowledgeContext).mock.calls.length,
      embed: vi.mocked(embedTexts).mock.calls.length,
    }

    const pineconeDelta = afterWarm.pinecone - afterCold.pinecone
    const knowledgeDelta = afterWarm.knowledge - afterCold.knowledge

    expect(pineconeDelta).toBe(0)
    expect(knowledgeDelta).toBe(0)

    const baselinePineconePerRequest = afterCold.pinecone
    metrics.setRate(
      "chat_pinecone_duplicate_call_reduction_pct",
      baselinePineconePerRequest > 0
        ? metrics.reductionPct(baselinePineconePerRequest, pineconeDelta)
        : 0,
    )
    metrics.recordHit("chat_pinecone_cache")
    metrics.recordMiss("chat_pinecone_cache")

    const hitRate = metrics.counterStats("chat_pinecone_cache")?.hitRate ?? 0
    metrics.setRate("chat_pinecone_cache_hit_rate", hitRate)

    expect(pineconeDelta).toBe(0)
    expect(metrics.buildReport().rates.chat_pinecone_duplicate_call_reduction_pct).toBe(100)
  })
})
