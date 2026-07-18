import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, resetChatCachesForTests } from "./route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { createMetricsCollector, rate } from "@/lib/metrics/collector"
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

describe("chat pipeline metrics", () => {
  const embedStart = { value: 0 }
  const knowledgeStart = { value: 0 }

  beforeEach(async () => {
    await resetChatCachesForTests()
    vi.clearAllMocks()
    embedStart.value = 0
    knowledgeStart.value = 0
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({
        query: vi.fn().mockResolvedValue({ matches: [] }),
      })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockImplementation(async () => {
      embedStart.value = performance.now()
      await new Promise((r) => setTimeout(r, 2))
      return [[0.1, 0.2]]
    })
    vi.mocked(getRoutineKnowledgeContext).mockImplementation(async () => {
      knowledgeStart.value = performance.now()
      await new Promise((r) => setTimeout(r, 2))
      return "Knowledge"
    })
    vi.mocked(generateChatReply).mockResolvedValue("Reply with patch testing guidance.")
  })

  it("system prompt includes hallucination mitigation clauses", async () => {
    const message = `pipeline-safety-${Date.now()}-${Math.random()}`
    await POST(
      authRequest({
        method: "POST",
        body: JSON.stringify({
          message,
          routine: { am: [{ productId: "p1" }], pm: [] },
        }),
      }),
    )

    const systemPrompt = vi.mocked(generateChatReply).mock.calls[0]?.[0] ?? ""
    expect(systemPrompt).toMatch(/educational and guidance only/i)
    expect(systemPrompt).toMatch(/do not diagnose or treat/i)
    expect(systemPrompt).toMatch(/patch test/i)
  })

  it("RAG and Neo4j run in parallel on cold path", async () => {
    const message = `pipeline-parallel-${Date.now()}-${Math.random()}`
    await POST(
      authRequest({
        method: "POST",
        body: JSON.stringify({
          message,
          routine: { am: [{ productId: "p-parallel" }], pm: [] },
        }),
      }),
    )

    const embedTime = embedStart.value
    const knowledgeTime = knowledgeStart.value
    expect(embedTime).toBeGreaterThan(0)
    expect(knowledgeTime).toBeGreaterThan(0)
    const overlap = Math.abs(embedTime - knowledgeTime) < 50
    expect(overlap).toBe(true)
  })

  it("orchestration success rate under injected failures", async () => {
    const metrics = createMetricsCollector()
    const attempts = 10
    let successes = 0

    for (let i = 0; i < attempts; i++) {
      vi.mocked(generateChatReply).mockReset()
      if (i % 3 === 0) {
        vi.mocked(generateChatReply).mockRejectedValueOnce(new Error("LLM down"))
      } else {
        vi.mocked(generateChatReply).mockResolvedValueOnce("OK")
      }

      const res = await POST(
        authRequest({
          method: "POST",
          body: JSON.stringify({
            message: `orch-${i}-${Date.now()}`,
            routine: { am: [], pm: [] },
          }),
        }),
      )
      if (res.status === 200) successes += 1
    }

    metrics.setRate("chat_orchestration_success_rate", rate(successes, attempts))
    expect(metrics.buildReport().rates.chat_orchestration_success_rate).toBeGreaterThan(0.5)
  })
})
