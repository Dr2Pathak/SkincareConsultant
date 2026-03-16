/**
 * Tests for sendChatMessage: error handling and server message propagation.
 * Mocks fetch so we don't hit the real API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("./auth-token", () => ({ getAccessToken: () => null }))

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("throws with server error message when response is 503 with JSON body", async () => {
    const serverError = "GEMINI_API_KEY is not set. Add it to .env.local to enable chat."
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: serverError }), {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          })
        )
      )
    )
    const { sendChatMessage } = await import("./api")
    await expect(sendChatMessage("hello")).rejects.toThrow(serverError)
    vi.unstubAllGlobals()
  })

  it("throws with server error message when response is 500 with JSON body", async () => {
    const serverError = "Something went wrong. Please try again."
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: serverError }), {
            status: 500,
            statusText: "Internal Server Error",
            headers: { "Content-Type": "application/json" },
          })
        )
      )
    )
    const { sendChatMessage } = await import("./api")
    await expect(sendChatMessage("hi")).rejects.toThrow(serverError)
    vi.unstubAllGlobals()
  })

  it("throws with fallback message when response body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("", {
            status: 500,
            statusText: "Internal Server Error",
          })
        )
      )
    )
    const { sendChatMessage } = await import("./api")
    await expect(sendChatMessage("hi")).rejects.toThrow("Something went wrong. Please try again.")
    vi.unstubAllGlobals()
  })

  it("returns reply when response is 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ reply: "Here is your answer." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      )
    )
    const { sendChatMessage } = await import("./api")
    const result = await sendChatMessage("hello")
    expect(result).toEqual({ reply: "Here is your answer." })
    vi.unstubAllGlobals()
  })
})
