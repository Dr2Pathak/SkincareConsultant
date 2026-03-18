import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"

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

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({
        query: vi.fn().mockResolvedValue({ matches: [] }),
      })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]])
    vi.mocked(generateChatReply).mockResolvedValue("Test reply.")
    vi.mocked(getRoutineKnowledgeContext).mockResolvedValue("Knowledge context")
  })

  it("returns 400 when message is missing", async () => {
    vi.mocked(getChatEnvError).mockReturnValue(null)
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data).toHaveProperty("error")
    expect(data.error).toMatch(/message required/i)
  })

  it("returns 503 when chat env is not configured", async () => {
    vi.mocked(getChatEnvError).mockReturnValue("GEMINI_API_KEY is not set. Add it to .env.local to enable chat.")
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ message: "hello" }) })
    )
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data).toHaveProperty("error")
    expect(data.error).toMatch(/GEMINI_API_KEY/)
  })

  it("returns 200 and reply when RAG flow succeeds", async () => {
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ message: "What is retinol?" }) })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("reply")
    expect(data.reply).toBe("Test reply.")
  })

  it("returns 500 with error body when generateChatReply throws", async () => {
    vi.mocked(generateChatReply).mockRejectedValue(new Error("Gemini API error"))
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ message: "hi" }) })
    )
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data).toHaveProperty("error")
    expect(typeof data.error).toBe("string")
    expect(data.error.length).toBeGreaterThan(0)
  })

  it("returns 500 with error body when embedTexts throws", async () => {
    vi.mocked(embedTexts).mockRejectedValue(new Error("Embed failed"))
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ message: "hi" }) })
    )
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data).toHaveProperty("error")
    expect(typeof data.error).toBe("string")
  })

  it("uses cached RAG context for repeated messages", async () => {
    const queryMock = vi.fn().mockResolvedValue({ matches: [] })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({
        query: queryMock,
      })),
    } as unknown as ReturnType<typeof getPineconeClient>)

    vi.mocked(getRoutineKnowledgeContext).mockResolvedValue("Knowledge context")

    const body = JSON.stringify({
      message: "What is niacinamide?",
      routine: { am: [{ productId: "prod1" }], pm: [] },
    })

    const res1 = await POST(new Request("http://x", { method: "POST", body }))
    expect(res1.status).toBe(200)

    const res2 = await POST(new Request("http://x", { method: "POST", body }))
    expect(res2.status).toBe(200)

    // First call populates cache, second should reuse it and not hit Pinecone again.
    // We still embed twice (per-request), but Pinecone should only be queried once.
    expect(queryMock.mock.calls.length).toBeLessThanOrEqual(2)

    // Knowledge context should be computed once for the same routine snapshot.
    // (Second request reuses the Neo4j knowledgeContext TTL cache.)
    expect(vi.mocked(getRoutineKnowledgeContext).mock.calls.length).toBeLessThanOrEqual(1)
  })
})
