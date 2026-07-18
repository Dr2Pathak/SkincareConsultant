export type RetryOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  label?: string
  shouldRetry?: (err: unknown) => boolean
}

const defaultShouldRetry = (err: unknown): boolean => {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("503")) return true
  }
  return false
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 200
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt >= maxAttempts || !shouldRetry(err)) throw err
      const delay = baseDelayMs * 2 ** (attempt - 1)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}
