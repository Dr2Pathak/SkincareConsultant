import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST, resetChatCachesForTests } from "./route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { authRequest } from "@/lib/test/chat-auth-mock"

vi.mock("@/lib/supabase/auth-server", () => ({
  getUserFromRequest: vi.fn(),
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

describe("POST /api/chat", () => {
  beforeEach(async () => {
    await resetChatCachesForTests()
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "test-user-metrics" } as Awaited<
      ReturnType<typeof getUserFromRequest>
    >)
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({
        query: vi.fn().mockResolvedValue({
          matches: [
            {
              id: "m1",
              metadata: { type: "ingredient", name: "Test", text: "Cached chunk for tests." },
            },
          ],
        }),
      })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]])
    vi.mocked(generateChatReply).mockResolvedValue("Test reply.")
    vi.mocked(getRoutineKnowledgeContext).mockResolvedValue("Knowledge context")
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null)
    const res = await POST(authRequest({ method: "POST", body: JSON.stringify({ message: "hi" }) }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when message is missing", async () => {
    const res = await POST(authRequest({ method: "POST", body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it("returns 503 when chat env is not configured", async () => {
    vi.mocked(getChatEnvError).mockReturnValue("GEMINI_API_KEY is not set. Add it to .env.local to enable chat.")
    const res = await POST(authRequest({ method: "POST", body: JSON.stringify({ message: "hello" }) }))
    expect(res.status).toBe(503)
  })

  it("returns 200 and reply when RAG flow succeeds", async () => {
    const res = await POST(
      authRequest({ method: "POST", body: JSON.stringify({ message: "What is retinol?" }) }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reply).toBe("Test reply.")
  })

  it("returns 500 when generateChatReply throws", async () => {
    vi.mocked(generateChatReply).mockRejectedValue(new Error("Gemini API error"))
    const res = await POST(authRequest({ method: "POST", body: JSON.stringify({ message: "hi" }) }))
    expect(res.status).toBe(500)
  })

  it("uses cached RAG context for repeated messages", async () => {
    const queryMock = vi.fn().mockResolvedValue({
      matches: [{ id: "m1", metadata: { type: "ingredient", name: "Niacinamide", text: "Context." } }],
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)

    const body = JSON.stringify({
      message: "What is niacinamide?",
      routine: { am: [{ productId: "prod1" }], pm: [] },
    })

    await POST(authRequest({ method: "POST", body }))
    await POST(authRequest({ method: "POST", body }))

    expect(queryMock.mock.calls.length).toBe(1)
    expect(vi.mocked(getRoutineKnowledgeContext).mock.calls.length).toBe(1)
  })
})
