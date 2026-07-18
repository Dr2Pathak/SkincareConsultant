/**
 * Upstash Redis REST client (no extra npm package).
 * https://upstash.com/docs/redis/features/restapi
 */

async function upstashCommand<T>(command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error("Upstash Redis not configured")
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) {
    throw new Error(`Upstash error: ${res.status}`)
  }
  const data = (await res.json()) as { result?: T; error?: string }
  if (data.error) throw new Error(data.error)
  return data.result as T
}

export async function upstashGet(key: string): Promise<string | null> {
  const result = await upstashCommand<string | null>(["GET", key])
  return result ?? null
}

export async function upstashSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await upstashCommand(["SET", key, value, "EX", ttlSeconds])
}

export async function upstashIncr(key: string): Promise<number> {
  const result = await upstashCommand<number>(["INCR", key])
  return typeof result === "number" ? result : Number(result)
}

export async function upstashExpire(key: string, ttlSeconds: number): Promise<void> {
  await upstashCommand(["EXPIRE", key, ttlSeconds])
}
