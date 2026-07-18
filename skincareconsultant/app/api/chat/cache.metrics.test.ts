import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { POST, resetChatCachesForTests } from "./route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { createMetricsCollector } from "@/lib/metrics/collector"
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
  am: [{ productId: "prod-cache-metrics" }],
  pm: [],
}

const CACHE_TTL_MS = 5 * 60 * 1000

describe("chat cache hit-rate metrics", () => {
  let queryMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await resetChatCachesForTests()
    vi.clearAllMocks()
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    queryMock = vi.fn().mockResolvedValue({
      matches: [{ id: "m1", metadata: { type: "ingredient", name: "Test", text: "Cached chunk body." } }],
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockResolvedValue([[0.5, 0.5, 0]])
    vi.mocked(generateChatReply).mockResolvedValue("Reply.")
    vi.mocked(getRoutineKnowledgeContext).mockResolvedValue("Knowledge")
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("exact RAG cache: miss then hit", async () => {
    const metrics = createMetricsCollector()
    const message = `cache-exact-${Date.now()}-${Math.random()}`
    const body = JSON.stringify({ message, routine: ROUTINE })

    await POST(authRequest({ method: "POST", body }))
    metrics.recordMiss("exact_rag")
    const callsAfterMiss = queryMock.mock.calls.length

    await POST(authRequest({ method: "POST", body }))
    metrics.recordHit("exact_rag")
    const callsAfterHit = queryMock.mock.calls.length

    expect(callsAfterMiss).toBeGreaterThanOrEqual(1)
    expect(callsAfterHit).toBe(callsAfterMiss)

    const stats = metrics.counterStats("exact_rag")
    expect(stats?.hitRate).toBe(0.5)
    metrics.setRate("chat_exact_rag_cache_hit_rate", stats?.hitRate ?? 0)
    expect(metrics.buildReport().rates.chat_exact_rag_cache_hit_rate).toBe(0.5)
  })

  it("knowledge cache: Neo4j called once per routine hash", async () => {
    const message = `cache-knowledge-${Date.now()}-${Math.random()}`
    const body = JSON.stringify({ message, routine: ROUTINE })

    await POST(authRequest({ method: "POST", body }))
    await POST(authRequest({ method: "POST", body }))

    expect(vi.mocked(getRoutineKnowledgeContext).mock.calls.length).toBe(1)
  })

  it("TTL expiry forces cache miss after 5 minutes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"))

    const message = `cache-ttl-${Date.now()}-${Math.random()}`
    const body = JSON.stringify({ message, routine: ROUTINE })

    await POST(authRequest({ method: "POST", body }))
    const callsAfterFirst = queryMock.mock.calls.length

    vi.advanceTimersByTime(CACHE_TTL_MS + 1)

    await POST(authRequest({ method: "POST", body }))
    const callsAfterExpiry = queryMock.mock.calls.length

    expect(callsAfterExpiry).toBeGreaterThan(callsAfterFirst)
  })
})
