/** Shared auth mock for chat route tests. */
import { vi } from "vitest"

export const TEST_USER = { id: "test-user-metrics" }

export function mockChatAuth() {
  vi.mock("@/lib/supabase/auth-server", () => ({
    getUserFromRequest: vi.fn().mockResolvedValue(TEST_USER),
  }))
}

export function authRequest(init: RequestInit & { body?: string }): Request {
  return new Request("http://x", {
    ...init,
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}
