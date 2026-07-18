import { describe, it, expect } from "vitest"
import { withTimeout, TimeoutError } from "./timeout"
import { withRetry } from "./retry"
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker"

describe("resilience", () => {
  it("withTimeout rejects slow operations", async () => {
    await expect(
      withTimeout(new Promise((r) => setTimeout(r, 50)), 5, "slow"),
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it("withRetry succeeds after transient failure", async () => {
    let n = 0
    const result = await withRetry(
      async () => {
        n += 1
        if (n < 2) throw new Error("timeout simulated")
        return "ok"
      },
      { maxAttempts: 3 },
    )
    expect(result).toBe("ok")
    expect(n).toBe(2)
  })

  it("circuit breaker opens after failures", async () => {
    const breaker = new CircuitBreaker("test-svc", 2, 1000)
    const fail = () => breaker.exec(() => Promise.reject(new Error("down")))
    await expect(fail()).rejects.toThrow("down")
    await expect(fail()).rejects.toThrow("down")
    await expect(fail()).rejects.toBeInstanceOf(CircuitOpenError)
  })
})
