/**
 * Lightweight request tracing (OpenTelemetry-compatible shape, no external SDK).
 * Set OTEL_EXPORTER=console to log span JSON in development.
 */

export type SpanStatus = { code: "ok" | "error"; message?: string }

export type Span = {
  name: string
  attributes: Record<string, string | number | boolean>
  setAttribute(key: string, value: string | number | boolean): void
  setStatus(status: SpanStatus): void
  recordException(err: Error): void
  end(): void
}

function shouldLogSpans(): boolean {
  if (process.env.OTEL_DISABLED === "1") return false
  return (
    process.env.OTEL_EXPORTER === "console" ||
    (process.env.NODE_ENV === "development" && process.env.OTEL_EXPORTER !== "none")
  )
}

function createSpan(name: string, attributes: Record<string, string | number | boolean>): Span {
  const started = performance.now()
  const attrs = { ...attributes }
  let status: SpanStatus = { code: "ok" }
  let exception: string | undefined

  return {
    name,
    attributes: attrs,
    setAttribute(key, value) {
      attrs[key] = value
    },
    setStatus(s) {
      status = s
    },
    recordException(err) {
      exception = err.message
      status = { code: "error", message: err.message }
    },
    end() {
      if (!shouldLogSpans()) return
      console.log(
        JSON.stringify({
          type: "span",
          name,
          durationMs: Math.round(performance.now() - started),
          attributes: attrs,
          status,
          exception,
        }),
      )
    },
  }
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const span = createSpan(name, attributes)
  try {
    const result = await fn(span)
    span.setStatus({ code: "ok" })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    span.recordException(err instanceof Error ? err : new Error(message))
    throw err
  } finally {
    span.end()
  }
}
