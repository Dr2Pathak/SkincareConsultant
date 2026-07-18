export class CircuitOpenError extends Error {
  constructor(service: string) {
    super(`Circuit open for ${service}`)
    this.name = "CircuitOpenError"
  }
}

type State = "closed" | "open" | "half_open"

export class CircuitBreaker {
  private state: State = "closed"
  private failures = 0
  private openedAt = 0

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 5,
    private readonly resetMs = 30_000,
  ) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.resetMs) {
        this.state = "half_open"
      } else {
        throw new CircuitOpenError(this.name)
      }
    }
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = "closed"
  }

  private onFailure(): void {
    this.failures += 1
    if (this.failures >= this.failureThreshold) {
      this.state = "open"
      this.openedAt = Date.now()
    }
  }
}

const breakers = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(name: string): CircuitBreaker {
  let b = breakers.get(name)
  if (!b) {
    b = new CircuitBreaker(name)
    breakers.set(name, b)
  }
  return b
}

/** Reset all breakers (tests). */
export function resetCircuitBreakersForTests(): void {
  breakers.clear()
}
